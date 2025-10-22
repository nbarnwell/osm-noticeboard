import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import qs from 'qs';

const osmClientId = process.env.OSM_client_id;
const osmClientSecret = process.env.OSM_client_secret;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class OsmClient {
    constructor() {
        this.osmRoot = 'https://www.onlinescoutmanager.co.uk'

        this.CACHE_DIR = path.join(__dirname, 'cache');
        this.cacheDuration = 15 * 60 * 1000;

        // Ensure cache directory exists
        fs.promises.mkdir(this.CACHE_DIR, { recursive: true }).catch(console.error);
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
        const cacheFile = path.join(this.CACHE_DIR, encodeURIComponent(url) + '.json');

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
        console.log(`fetchAndCache: ${url}, ${cacheFile}`);

        const tryReadCache = async () => {
            try {
                const cachedText = await fs.promises.readFile(cacheFile, 'utf-8');
                return JSON.parse(cachedText);
            } catch {
                return null;
            }
        };

        const tryFetch = async (attempt) => {
            try {
                const response = await this.#callOsm(url);
                const text = await response.text();
                if (!response.ok) {
                    console.error(`   fetchAndCache.tryFetch: HTTP ${response.status} ${response.statusText} for ${url} ${text}`);
                    throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
                }

                const data = JSON.parse(text);

                await fs.promises.writeFile(cacheFile, text, 'utf-8');
                return data;
            } catch (error) {
                console.error(`   fetchAndCache: Attempt ${attempt} failed for ${url} (${error.message})`);
                return null;
            }
        };

        // --- Try first fetch ---
        let data = await tryFetch(1);

        // --- Retry once after 1s if failed ---
        if (!data) {
            console.log(`   fetchAndCache: Retrying ${url} after 1 second...`);
            await new Promise(r => setTimeout(r, 1000));
            data = await tryFetch(2);
        }

        if (data) return data;

        // --- Fallback to cache if both attempts failed ---
        const cached = await tryReadCache();
        if (cached) {
            console.warn(`   fetchAndCache: Using cached data for ${url}`);
            return cached;
        }

        console.error(`   fetchAndCache: No usable data or cache for ${url}`);
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
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
    
        return response;
    }

    async #getOsmToken() {
        const tokenData = await this.#getTokenData();
        if (tokenData !== null) {
            return tokenData.token;
        }

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
    }

    async #saveTokenData(token) {
        const tokenData = { token: token };
        const tokenFile = path.join(this.CACHE_DIR, 'token.json');
        await fs.promises.writeFile(tokenFile, JSON.stringify(tokenData, null, 2), 'utf-8');
    }

    async #getTokenData() {
        const tokenFile = path.join(this.CACHE_DIR, 'token.json');
        if (!fs.existsSync(tokenFile)) {
            return null;
        }
        const content = await fs.promises.readFile(tokenFile, 'utf-8');
        const tokenData = JSON.parse(content);
        return tokenData;
    }

    async #clearTokenData() {
        const tokenFile = path.join(this.CACHE_DIR, 'token.json');
        if (!fs.existsSync(tokenFile)) {
            return;
        }
        fs.unlinkSync(tokenFile);
    }

    async #saveApiState(response) {
        const tooManyRequests = response.status === 429;
        const retryAfterSeconds = tooManyRequests ? parseInt(response.headers.get('Retry-After')) : 0;
        const date = new Date();
        const osmApiState = {
            LastCallTime: date,
            TooManyRequests: tooManyRequests,
            RetryAfterSeconds: retryAfterSeconds,
            RetryAfterTime: new Date(date.getTime() + retryAfterSeconds * 1000),
            RateLimitLimit: parseInt(response.headers.get('X-RateLimit-Limit')),
            RateLimitRemaining: parseInt(response.headers.get('X-RateLimit-Remaining')),
            RateLimitReset: parseInt(response.headers.get('X-RateLimit-Reset')),
            Blocked: new Boolean(response.headers.get('X-Blocked'))
        };

        const apiStateFile = path.join(this.CACHE_DIR, 'apiState.json');
        await fs.promises.writeFile(apiStateFile, JSON.stringify(osmApiState, null, 2), 'utf-8');
    }

    async #apiStateIsGood() {
        const apiStateFile = path.join(this.CACHE_DIR, 'apiState.json');

        if (!fs.existsSync(apiStateFile)) {
            // Assume we can at least try if we have no data suggesting otherwise
            console.log("No API state file found, assuming we can try");
            return true;
        }

        const previousApiStateFileContent = await fs.promises.readFile(apiStateFile, 'utf-8');

        if (!previousApiStateFileContent) {
            console.error("API state file is empty, assuming we can try");  
            return true;
        }

        const previousApiState = JSON.parse(previousApiStateFileContent, (key, value) => key === 'LastCallTime' ? new Date(value) : value);

        if (previousApiState.Blocked) {
            console.error("Client is blocked");
            return false;
        }

        const date = new Date();
        if (previousApiState.tooManyRequests && date < previousApiState.RetryAfterTime) {
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