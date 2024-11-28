
function loadSectionConfig() {
    const url = 'http://localhost:3000/api/section-config';

    fetch(url, { method: 'GET'})
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            response.json()
                    .then(x => console.log(x));
        });
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