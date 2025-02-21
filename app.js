import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import qs from 'qs';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import Queries from './Queries.js';

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const osmClientId = process.env.OSM_client_id;
const osmClientSecret = process.env.OSM_client_secret;

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use((err, req, res, next) => {
    console.error('An error occurred:', err.message); // Log the error
    res.status(500).json({ error: 'Internal Server Error' }); // Respond with a 500 status
});

const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

async function callOsm(token, url) {
    console.log("Calling " + url);
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Bearer ' + token
        },
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
}

async function testOsm(token, url) {
    const response = await fetch(url, {
        method: 'get',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Bearer ' + token
        },
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
}

app.get('/api/test', async (req, res) => {
    /*
    const terms = await callOsm(req.cookies.osmt, 'https://www.onlinescoutmanager.co.uk/api.php?action=getTerms');
    const now = new Date();
    
    const termsList = 
        Object.keys(terms)
              .map(x => terms[x])
              .filter(x => {
                    const startDate = new Date(section.startdate);
                    const endDate = new Date(section.enddate);
                    return startDate <= now && endDate >= now;
              });
*/
    /* https://www.onlinescoutmanager.co.uk/ext/generic/startup/?action=getData
    */
    var json = await testOsm(req.cookies.osmt, 'https://www.onlinescoutmanager.co.uk/ext/programme/?action=getProgramme&sectionid=8757&termid=794609');
    res.json(json);
});


app.get('/api/evenings', asyncHandler(async (req, res) => {
    const { count } = req.query;
    const queries = new Queries(req.cookies.osmt);
    const sections = await queries.getSections();
    const terms = await queries.getTerms();
    const evenings = (
        await Promise.all(
            terms.map(async x => {
                const p = await queries.getProgramme(x.sectionId, x.id);
                return p.items.map((evening) => ({
                    id: evening.eveningid,
                    sectionId: evening.sectionid,
                    termId: x.id,
                    title: evening.title,
                    startTime: new Date(evening.starttime),
                    endTime: new Date(evening.endtime),
                }));
            })
        )
    ).flat(); // Flatten the resulting array of arrays
    res.json(evenings);
}));

app.get('/api/sections/:sectionId/terms/:termId/evening/:eveningId', async (req, res) => {
    const filePath = path.join(__dirname, 'example-responses', 'exampleprogramme.json');
    res.sendFile(filePath);
});

app.get('/api/sections', async (req, res) => {
    const json = await callOsm(req.cookies.osmt, 'https://www.onlinescoutmanager.co.uk/api.php?action=getSectionConfig')
    res.send(json);
});

app.get('/api/terms', async (req, res) => {
    const json = await callOsm(req.cookies.osmt, 'https://www.onlinescoutmanager.co.uk/api.php?action=getTerms');
    res.send(json);
});

app.get('/auth', async (req, res) => {
    const data = qs.stringify({
        grant_type: 'client_credentials',
        client_id: osmClientId,
        client_secret: osmClientSecret,
        scope: 'section:programme:read'
    });

    const response = await fetch('https://www.onlinescoutmanager.co.uk/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data,
    });

    if (!response.ok) {
        res.status(500).send(new Error(`Error with OSM auth: ${response.statusText}`));
        return;
    }

    const text = await response.text();
    const json = JSON.parse(text);
    const token = json.access_token;
    res.cookie('osmt', token, {
        httpOnly: true,  // Prevent access via JavaScript
        secure: false,    // Ensures the cookie is sent over HTTPS
        sameSite: 'Strict', // Prevent CSRF
        maxAge: 3600000  // Cookie expires in 1 hour (optional)
    });
    res.sendStatus(204);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});