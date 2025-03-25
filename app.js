import express from 'express';
import path from 'path';
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

app.get('/api/evenings', asyncHandler(async (req, res) => {
    const queries = new Queries();
    const terms = await queries.getTerms();
    const today = Date.now();
    const evenings = (
        await Promise.all(
            terms.filter(term => term.startDate <= today && term.endDate >= today)
                 .map(async term => {
                    const p = await queries.getProgramme(term.sectionId, term.id);
                    if (p !== null && p.hasOwnProperty('items') && Array.isArray(p.items)) {
                        return p.items.map((evening) => ({
                            id: evening.eveningid,
                            sectionId: evening.sectionid,
                            termId: term.id,
                            title: evening.title,
                            startDateTime: new Date(evening.meetingdate + ' ' + evening.starttime),
                            endDateTime: new Date(evening.meetingdate + ' ' + evening.endtime)
                            // TODO Add more properties here to show the section and term details, and badges
                        }));
                    };
            })
        )
    ).flat(); // Flatten the resulting array of arrays
    res.json(evenings);
}));

app.get('/api/sections/:id', asyncHandler(async (req, res, next) => {
    const queries = new Queries();
    const sections = await queries.getSections();
    const sectionMap = new Map(sections.map(x => [x.id, x]));
    const id = parseInt(req.params.id);
    const section = sectionMap.get(id);

    if (section) {
        return res.json(section);
    } else {
        return next({ status: 404, message: `Section ${id} not found` }); // Pass the error to the next middleware
    }
}));

app.delete('api/cache', asyncHandler(async (req, res) => {
    // TODO Delete any stored cache files so they will be re-fetched by the next operation
}));

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});