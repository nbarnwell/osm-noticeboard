function displayJson(obj) {
    const formattedJson = JSON.stringify(obj, null, 4);
    document.getElementById('response').textContent = formattedJson;
}

function displayText(text) {
    document.getElementById('response').innerText = text;
}

async function test() {
    const url = 'http://localhost:3000/api/test';

    const response = await fetch(url, { method: 'GET'});
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json = await response.json()
    displayJson(json);
}

async function loadEvenings() {
    const url = 'http://localhost:3000/api/evenings?count=2';

    const response = await fetch(url, { method: 'GET'});
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json = await response.json()
    displayJson(json);
}

async function loadTerms() {
    const url = 'http://localhost:3000/api/terms';

    const response = await fetch(url, { method: 'GET'});
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json = await response.json();
    displayJson(json);
}

async function loadSectionConfig() {
    const url = 'http://localhost:3000/api/sections';

    const response = await fetch(url, { method: 'GET'});
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json = await response.json()
    displayJson(json);
}

async function refreshAccessToken() {
    // Make the request to get the access token
    const tokenUrl = 'http://localhost:3000/auth'
    try {
        const response = await fetch(tokenUrl, { method: 'GET' });

        if (response.ok) {
            displayText("Authenticated successfully");
        } else {
            alert(`Failed to get access token: ${response.statusText} (OSM response: ${data})`);
        }
    } catch (error) {
        console.error('Error during token request:', error);
        alert('Error during token request: ' + error);
    }
}