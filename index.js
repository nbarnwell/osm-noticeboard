const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, Node.js!');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

// Install axios first
// npm install axios
/* const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

app.get('/get-access-token', async (req, res) => {
    const tokenUrl = 'https://www.onlinescoutmanager.co.uk/oauth/token';
    const clientId = 'your-client-id';
    const clientSecret = 'your-client-secret';

    try {
        const response = await axios.post(tokenUrl, null, {
            params: {
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // Send the access token back to the client
        res.json({ access_token: response.data.access_token });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error obtaining access token');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
 */