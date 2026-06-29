import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import qs from 'qs';
import { initTokenDb, saveToken, getToken, clearToken, saveApiState, getApiState } from './appState.js';

const osmClientId = process.env.OSM_client_id;
const osmClientSecret = process.env.OSM_client_secret;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class OsmClient {
    // Static promise to ensure only one token acquisition happens at a time
    static #tokenAcquisitionPromise = null;
    
    constructor() {
        this.osmRoot = 'https://www.onlinescoutmanager.co.uk'

        this.CACHE_DIR = path.join(__dirname, 'cache');
        this.cacheDuration = 15 * 60 * 1000;

        // Ensure cache directory exists
        fs.promises.mkdir(this.CACHE_DIR, { recursive: true }).catch(console.error);
        // Ensure token DB exists
        initTokenDb().catch(console.error);
    }

    async getStartup() {
        return await this.#fetchWithCache('ext/generic/startup/?action=getDataPayload');
    }

    async getSectionConfig() {
        return await this.#fetchWithCache('api.php?action=getSectionConfig');
    }

    async getTerms() {
        return await this.#fetchWithCache('api.php?action=getTerms');
    }

    async getProgrammeDetail(sectionId, termId, eveningId) {
        return await this.#fetchWithCache(`ext/programme/?action=getProgramme&eveningid=${parseInt(eveningId)}&sectionid=${parseInt(sectionId)}&termid=${parseInt(termId)}`);
    }

    async getProgramme(sectionId, termId) {
        return await this.#fetchWithCache(`ext/programme/?action=getProgramme&sectionid=${parseInt(sectionId)}&termid=${parseInt(termId)}`);
    }

    async getProgrammeSummary(sectionId, termId) {
        return await this.#fetchWithCache(`ext/programme/?action=getProgrammeSummary&sectionid=${parseInt(sectionId)}&termid=${parseInt(termId)}&verbose=1`);
    }

    async getEvents(sectionId, termId) {
        return await this.#fetchWithCache(`ext/events/summary/?action=get&sectionid=${parseInt(sectionId)}&termid=${parseInt(termId)}`);
    }

    async #fetchWithCache(url) {
        // Replace only illegal filename characters for Windows/Unix
        // Windows: < > : " / \ | ? * and control chars; Unix: /
        const safeFilename = url.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
        const cacheFile = path.join(this.CACHE_DIR, safeFilename + '.json');

        try {
            const stats = await fs.promises.stat(cacheFile);
            const now = new Date();

            if (now - stats.mtimeMs < this.cacheDuration) {
                console.log(`Returning cached response from ${cacheFile} for ${url}`);
                const data = await fs.promises.readFile(cacheFile, 'utf-8');
                return JSON.parse(data);
            } else {
                console.log(`Cache expired, deleting ${cacheFile}`);
                await fs.promises.unlink(cacheFile);
            }
        } catch (error) {
            if (error.code !== 'ENOENT') console.error('Error checking cache:', error);
        }

        return this.#fetchAndCache(url, cacheFile);
    }

    // Private method: Fetch from API and store in cache
    async #fetchAndCache(url, cacheFile) {
        console.log(`OsmClient.#fetchAndCache: ${url}, ${cacheFile}`);

        const tryReadCache = async () => {
            try {
                const cachedText = await fs.promises.readFile(cacheFile, 'utf-8');
                return JSON.parse(cachedText);
            } catch (error) {
                if (error.code !== 'ENOENT' && error.errno !== -4058) {
                    console.error(`OsmClient.#fetchAndCache.tryReadCache: Unable to read cache file ${cacheFile}`, error);
                }
                return null;
            }
        };

        const tryFetch = async (attempt) => {
            const response = await this.#callOsm(url);
            const responseText = await response.text()
            const text = responseText.replace(/^var data_holder = /, '');
            if (!response.ok) {
                console.error(`OsmClient.#fetchAndCache.tryFetch(${attempt}) ${response.status} ${response.statusText} ${url}. Response text: ${text}`, error);
                return null;
            }

            try {
                const data = JSON.parse(text);
                await fs.promises.writeFile(cacheFile, text, 'utf-8');
                return data;
            } catch (error) {
                console.error(`OsmClient.#fetchAndCache.tryFetch(${attempt}) failed to parse JSON for ${url}. Response text: ${text}`, error);
                return null;
            }
        };

        // --- Try first fetch ---
        let data = await tryFetch(1);

        // --- Retry once after 1s if failed ---
        if (!data) {
            console.log(`OsmClient.#fetchAndCache: Retrying ${url} after 1 second...`);
            await new Promise(r => setTimeout(r, 1000));
            data = await tryFetch(2);
        }

        if (data) return data;

        // --- Fallback to cache if both attempts failed ---
        const cached = await tryReadCache();
        if (cached) {
            console.warn(`OsmClient.#fetchAndCache: Using cached data for ${url}`);
            return cached;
        }

        console.error(`OsmClient.#fetchAndCache: No usable data or cache for ${url}`);
        return null;
    }

    async #callOsm(url) {
        const fullUrl = new URL(url, this.osmRoot);
        const token = await this.#getOsmToken();

        if (!(await this.#apiStateIsGood())) {
            throw new Error("API state indicates failure")
        }

        const response = await fetch(fullUrl.toString(), {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            },
        });

        if (response.status === 403) {
            console.log("Token expired, refreshing token...");
            this.#clearTokenData();
            return this.#callOsm(url);
        }

        await this.#saveApiState(response);

        if (!response.ok) {
            throw new Error(`Error: ${response.status} ${response.statusText} for ${fullUrl}`);
        }
    
        return response;
    }

    async #getOsmToken() {
        // First, try to get existing token
        const tokenData = await this.#getTokenData();
        if (tokenData !== null) {
            return tokenData.token;
        }

        // If no token exists, use a lock to ensure only one acquisition happens at a time
        if (OsmClient.#tokenAcquisitionPromise) {
            console.log("Token acquisition already in progress, waiting...");
            await OsmClient.#tokenAcquisitionPromise;
            
            // After waiting, try to get the token again (another request may have acquired it)
            const newTokenData = await this.#getTokenData();
            if (newTokenData !== null) {
                console.log("Using token acquired by another request");
                return newTokenData.token;
            }
        }

        // Create a new acquisition promise that others can wait on
        OsmClient.#tokenAcquisitionPromise = (async () => {
            try {
                console.log("Acquiring new token from OSM...");
                
                if (!(await this.#apiStateIsGood())) {
                    throw new Error("API state indicates failure")
                }

                const body = qs.stringify({
                    grant_type: 'client_credentials',
                    client_id: osmClientId,
                    client_secret: osmClientSecret,
                    scope: 'section:programme:read section:event:read'
                });

                const response = await fetch('https://www.onlinescoutmanager.co.uk/oauth/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: body,
                });

                await this.#saveApiState(response);

                if (!response.ok) {
                    console.error("Unable to authenticate with OSM: ", response.statusText);
                    throw new Error("Unable to Authenticate with OSM");
                }

                const data = await response.json();
                
                await this.#saveTokenData(data.access_token);

                return data.access_token;
            } finally {
                // Clear the promise after completion (success or failure)
                OsmClient.#tokenAcquisitionPromise = null;
            }
        })();

        return await OsmClient.#tokenAcquisitionPromise;
    }

    async #saveTokenData(token) {
        await saveToken(token);
    }

    async #getTokenData() {
        return await getToken();
    }

    async #clearTokenData() {
        await clearToken();
    }

    async #saveApiState(response, responseBody = null) {
        const tooManyRequests = response.status === 429;
        const retryAfterSeconds = tooManyRequests ? parseInt(response.headers.get('Retry-After')) : 0;
        const date = new Date();
        const blockedHeader = response.headers.get('X-Blocked');
        
        // If no body provided, try to clone and read it (for error responses)
        let bodyText = responseBody;
        if (!bodyText && !response.ok) {
            try {
                const clonedResponse = response.clone();
                bodyText = await clonedResponse.text();
                // Limit body size to prevent huge storage
                if (bodyText.length > 5000) {
                    bodyText = bodyText.substring(0, 5000) + '... (truncated)';
                }
            } catch (e) {
                bodyText = '(unable to capture response body)';
            }
        }
        
        const osmApiState = {
            LastCallTime: date,
            TooManyRequests: tooManyRequests,
            RetryAfterSeconds: retryAfterSeconds,
            RetryAfterTime: new Date(date.getTime() + retryAfterSeconds * 1000),
            RateLimitLimit: parseInt(response.headers.get('X-RateLimit-Limit')),
            RateLimitRemaining: parseInt(response.headers.get('X-RateLimit-Remaining')),
            RateLimitReset: parseInt(response.headers.get('X-RateLimit-Reset')),
            Blocked: blockedHeader === 'true' || blockedHeader === '1',
            LastResponseBody: bodyText || null
        };

        await saveApiState(osmApiState);
    }

    async #apiStateIsGood() {
        const previousApiState = await getApiState();

        if (!previousApiState) {
            // Assume we can at least try if we have no data suggesting otherwise
            console.log("No API state found");
            return true;
        }

        if (previousApiState.Blocked) {
            console.error("Client is blocked");
            return false;
        }

        const date = new Date();
        if (previousApiState.TooManyRequests && date < previousApiState.RetryAfterTime) {
            console.error("Can't try again until ", previousApiState.RetryAfterTime)
            return false;
        }

        if (previousApiState.RateLimitRemaining !== null && previousApiState.RateLimitRemaining < 5) {
            console.error("Less than 5 OSM API calls remaining, suggest waiting");
            return false;
        }
    
        return true;
    }

    // Private method: Cleanup old cache files
    async #cleanupOldCache() {
        try {
            const files = await fs.promises.readdir(this.CACHE_DIR);
            const now = new Date();

            for (const file of files) {
                const filePath = path.join(this.CACHE_DIR, file);
                const stats = await fs.promises.stat(filePath);

                if (now - stats.mtimeMs > this.cacheDuration * 2) {
                    await fs.promises.unlink(filePath);
                    console.log(`Deleted old cache file: ${file}`);
                }
            }
        } catch (error) {
            console.error('Error cleaning cache:', error);
        }
    }
}

export default OsmClient;