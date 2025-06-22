/**
 * Display formatted JSON in the response element
 * @param {Object} obj - Object to display
 */
function displayJson(obj) {
    const formattedJson = JSON.stringify(obj, null, 4);
    document.getElementById('response').textContent = formattedJson;
}

/**
 * Display text in the response element
 * @param {string} text - Text to display
 */
function displayText(text) {
    document.getElementById('response').textContent = text;
}

/**
 * Call OSM API with authentication
 * @param {string} token - Authentication token
 * @param {string} url - API endpoint
 * @returns {Promise<Object>} JSON response
 */
async function callOsm(token, url) {
    console.log(`Calling ${url}`);
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${token}`
        },
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Load evenings data
 */
async function loadEvenings() {
    const url = 'http://localhost:3000/api/evenings?count=2';

    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json = await response.json();
    displayJson(json);
}

/**
 * Load terms data
 */
async function loadTerms() {
    const url = 'http://localhost:3000/api/terms';

    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json = await response.json();
    displayJson(json);
}

/**
 * Load section configuration data
 */
async function loadSectionConfig() {
    const url = 'http://localhost:3000/api/sections';

    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json = await response.json();
    displayJson(json);
}

/**
 * Refresh the OSM access token
 */
async function refreshAccessToken() {
    // Make the request to get the access token
    const tokenUrl = 'http://localhost:3000/auth';
    try {
        const response = await fetch(tokenUrl, { method: 'GET' });

        if (response.ok) {
            displayText("Authenticated successfully");
        } else {
            const data = await response.text();
            alert(`Failed to get access token: ${response.statusText} (OSM response: ${data})`);
        }
    } catch (error) {
        console.error('Error during token request:', error);
        alert(`Error during token request: ${error}`);
    }
}