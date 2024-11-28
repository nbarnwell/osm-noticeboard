// Install axios first
// npm install axios
import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import qs from 'qs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/get-access-token', async (req, res) => {
    const data = qs.stringify({
        grant_type: 'client_credentials',
        client_id: 'wScRdGaCnobiXdkvwF63o0nzBX2FQiz3',
        client_secret: 'eySNzAj6RjW85Us5wVbdv2XJ84mrHTEXLnpqG0Ygci6JFNB3A3mdKuKgK2nbJhMX',
    });

    const response = await fetch('https://www.onlinescoutmanager.co.uk/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data,
    });

    if (!response.ok) {
        res.status(500).send(`Error from OSM auth: ${response.statusText}`);
        return;
    }

    const json = await response.json();
    res.send(json.access_token);
});

app.use((err, req, res, next) => {
    console.log("got error");
    console.error(err.stack);

    // replace this with whatever UI you want to show the user
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});