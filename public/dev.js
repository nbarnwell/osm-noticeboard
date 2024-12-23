
async function test() {
    const url = 'http://localhost:3000/api/test';

    const response = await fetch(url, { method: 'GET'});
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json = await response.json()
    const formattedJson = JSON.stringify(json, null, 4);
    document.getElementById('response').innerText = formattedJson;
}

async function loadEvenings() {
    const url = 'http://localhost:3000/api/evenings?count=2';

    const response = await fetch(url, { method: 'GET'});
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json = await response.json()
    const formattedJson = JSON.stringify(json, null, 4);
    document.getElementById('response').innerText = formattedJson;
}

async function loadTerms() {
    const url = 'http://localhost:3000/api/terms';

    const response = await fetch(url, { method: 'GET'});
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json = await response.text()
    document.getElementById('response').innerText = json;
}

async function loadSectionConfig() {
    const url = 'http://localhost:3000/api/sections';

    const response = await fetch(url, { method: 'GET'});
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json = await response.text()
    document.getElementById('response').innerText = json;
}

async function refreshAccessToken() {
    // Make the request to get the access token
    const tokenUrl = 'http://localhost:3000/auth'
    try {
        const response = await fetch(tokenUrl, { method: 'GET' });
        const data = await response.text();

        if (response.ok) {
            // Save the access token in localStorage
            alert('Access token saved to localStorage!');
        } else {
            alert(`Failed to get access token: ${response.statusText} (OSM response: ${data})`);
        }
    } catch (error) {
        console.error('Error during token request:', error);
        alert('Error during token request: ' + error);
    }
}