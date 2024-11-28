import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import qs from 'qs';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

app.get('/api/section-config', async (req, res) => {
    const url = 'https://www.onlinescoutmanager.co.uk/api.php?action=getSectionConfig';

    const token = req.cookies.osmt;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Bearer ' + token
        },
    });
    if (!response.ok) {
        res.status(500).send(new Error(`Error: ${response.statusText}`));
        return;
    }

    response.json().then(x => {
        res.send(x);
    });
});

app.get('/auth', async (req, res) => {
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
        res.status(500).send(new Error(`Error: ${response.statusText}`));
        return;
    }

    const json = await response.json();
    const token = json.access_token;
    res.cookie('osmt', token, {
        httpOnly: true,  // Prevent access via JavaScript
        secure: false,    // Ensures the cookie is sent over HTTPS
        sameSite: 'Strict', // Prevent CSRF
        maxAge: 3600000  // Cookie expires in 1 hour (optional)
    });
    res.sendStatus(204);
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