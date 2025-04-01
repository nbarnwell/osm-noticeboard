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
        this.cacheDuration = 60 * 60 * 1000;

        // Ensure cache directory exists
        fs.promises.mkdir(this.CACHE_DIR, { recursive: true }).catch(console.error);
    }

    async getSectionConfig() {
        return await this.#fetchWithCache('api.php?action=getSectionConfig');
    }

    async getTerms() {
        return await this.#fetchWithCache('api.php?action=getTerms');
    }

    async getProgramme(sectionId, termId) {
        return await this.#fetchWithCache(`ext/programme/?action=getProgramme&sectionid=${parseInt(sectionId)}&termid=${parseInt(termId)}`);
    }

    async getEvents(sectionId, termId) {
        return await this.#fetchWithCache(`ext/events/summary/?action=get&sectionid=${parseInt(sectionId)}&termid=${parseInt(termId)}`);
    }

    async #fetchWithCache(url) {
        const cacheFile = path.join(this.CACHE_DIR, encodeURIComponent(url) + '.json');

        try {
            const stats = await fs.promises.stat(cacheFile);
            const now = Date.now();

            if (now - stats.mtimeMs < this.cacheDuration) {
                console.log('Returning cached response from file');
                const data = await fs.promises.readFile(cacheFile, 'utf-8');
                return JSON.parse(data);
            } else {
                //console.log('Cache expired, deleting files');
                //await this.#cleanupOldCache();
            }
        } catch (error) {
            if (error.code !== 'ENOENT') console.error('Error checking cache:', error);
        }

        return this.#fetchAndCache(url, cacheFile);
    }

    // Private method: Fetch from API and store in cache
    async #fetchAndCache(url, cacheFile) {
        try {
            console.log('Fetching fresh data from API');
            const response = await this.#callOsm(url);

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            await fs.promises.writeFile(cacheFile, JSON.stringify(data, null, 2), 'utf-8');
            return data;
        } catch (error) {
            console.error('Error fetching API:', error.message);

            // If API fails, return cached version if available
            try {
                const data = await fs.promises.readFile(cacheFile, 'utf-8');
                console.log('Returning stale cached response');
                return JSON.parse(data);
            } catch {
                console.error('No valid cache available');
                return null;
            }
        }
    }

    async #callOsm(url) {
        const fullUrl = new URL(url, this.osmRoot);
        console.log("Querying " + fullUrl);
        const token = await this.#getOsmToken();

        if (!(await this.#apiStateIsGood())) {
            throw new Error("API state indicates failure")
        }

        const response = await fetch(fullUrl.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
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
            Blocked: response.headers.get('X-Blocked')
        };

        const apiStateFile = path.join(this.CACHE_DIR, 'apiState.json');
        await fs.promises.writeFile(apiStateFile, JSON.stringify(osmApiState, null, 2), 'utf-8');
    }

    async #apiStateIsGood() {
        const apiStateFile = path.join(this.CACHE_DIR, 'apiState.json');

        if (!fs.existsSync(apiStateFile)) {
            // Assume we can at least try if we have no data suggesting otherwise
            return true;
        }

        const previousApiStateFileContent = await fs.promises.readFile(apiStateFile, 'utf-8');
        const previousApiState = JSON.parse(previousApiStateFileContent, (key, value) => key === 'LastCallTime' ? new Date(value) : value);

        if (previousApiState.Blocked) {
            console.error("Client is blocked");
            return false;
        }

        const date = Date.now();
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
            const now = Date.now();

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