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

app.delete('api/cache', asyncHandler(async (req, res) => {
    // TODO Delete any stored cache files so they will be re-fetched by the next operation
}));

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});