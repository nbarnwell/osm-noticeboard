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

/// Used when a date is in DD/MM/YYYY format, which JavaScript's Date doesn't support
const parseDate = (dateString) => {
    const [day, month, year] = dateString.split("/").map(Number);
    const date = new Date(year, month - 1, day); // Month is 0-based in JS
    return date;
};

app.get('/public/images/badges/:sectionName/:badgeType/:badgeName.png', (req, res) => {
    const { sectionName, badgeType, badgeName } = req.params;
    const filePath = badgeUrl(sectionName, badgeType, badgeName);
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(err.status).end();
        }
    });
});

const badgeUrl = (sectionName, badgeType, badgeName) => {
    return path.join(__dirname, `public`, 'images', 'badges', badgeSubFolder(sectionName, badgeType), `${badgeFileName(sectionName, badgeType, badgeName)}${badgeSuffix(sectionName)}.png`);
};

const badgeSuffix = (sectionName, badgeType) => {
    if (sectionName === 'Squirrels') {
        return '';
    }

    return '-RGB'
}

const badgeFileName = (sectionName, badgeType, badgeName) => {
    if (sectionName === 'Squirrels') {
        return badgeName;
    }

    if (badgeName === 'Hikes') {
        badgeName = 'Hikes Away';
    }

    badgeName = badgeName.replace(/ /g, '-').replace(/'/g, '').replace(/&/g, 'and').replace(/\./g, '');

    if (badgeType === 'Staged') {
        badgeName += '-Stage-1';
    }

    return `${badgeNamePrefix(sectionName, badgeType)}-${badgeSectionAbbreviation(badgeType, sectionName)}${badgeName}`;
};

const badgeSectionAbbreviation = (badgeType, sectionName) => {
    if (badgeType === 'Staged') {
        return '';
    }

    return sectionName.substring(0, 1).toUpperCase() + sectionName.substring(1, 2).toLowerCase() + '-';
};

const badgeSubFolder = (sectionName, badgeType) => {
    // Staged activity badges are for all sections
    if (badgeType === 'Staged') {
        return 'staged-activity-badges-zip-download';
    }

    // Activity badges are for each section
    if (badgeType === 'Activity') {
        switch (sectionName) {
            case 'Squirrels':
                return 'activity-badges-squirrels-zip-download/PNG';
            case 'Beavers':
                return 'Activity Badges-Beavers';
            case 'Cubs':
                return 'Activity Badges-Cubs';
            case 'Scouts':
                return 'Scouts - New-Y';
            case 'Explorers':
                return null;
            case 'Network':
                return 'badges';
            default:
                return `UnknownBadgeSubFolder-${sectionName}-${badgeType}`;
        }
    }

    // Challenge badges are for each section
    if (badgeType === 'Challenge') {
        switch (sectionName) {
            case 'Beavers':
                return 'Challenge Award Badges-Beavers';
            case 'Cubs':
                return 'Challenge Award Badges-Cubs';
            case 'Scouts':
                return null;
            default:
                return `UnknownBadgeSubFolder-${sectionName}-${badgeType}`;
        }
    }

    return `UnkownBadgeSubFolder-${sectionName}-${badgeType}`;
};

const badgeNamePrefix = (sectionName, badgeType) => {
    if (sectionName === 'Squirrels') {
        return ''; 
    }

    switch (badgeType) {
        case 'Activity':
            return 'Activity-Badges';
        case 'Challenge':
            return 'Challenge-Awards';
        case 'Staged':
            return 'Staged-Activities';
        default:
            return `UnknownBadgePrefix-${badgeType}`;
    }
};

app.get('/api/evenings', asyncHandler(async (req, res) => {
    const queries = new Queries();
    const terms = await queries.getTerms();
    // const now = new Date('2025-04-03T19:15:00'); // Simulated current date
    const now = Date.now(); // Current date and time
    
    const evenings = (
        await Promise.all(
            terms.filter(term => term.startDate <= now && term.endDate >= now)
                .map(async term => {
                    const programme = await queries.getProgramme(term.sectionId, term.id);
                    
                    if (programme && Array.isArray(programme.items)) {
                        return Promise.all(
                            programme.items.map(async (evening) => {
                                const programmeDetail = await queries.getProgrammeDetail(term.sectionId, term.id, evening.eveningid);
                                return {
                                    id: evening.eveningid,
                                    sectionId: evening.sectionid,
                                    termId: term.id,
                                    title: evening.title,
                                    startDateTime: new Date(evening.meetingdate + ' ' + evening.starttime),
                                    endDateTime: new Date(evening.meetingdate + ' ' + evening.endtime),
                                    notesForParents: evening.notesforparents,
                                    parentsRequired: parseInt(evening.parentsrequired),
                                    badgeLinks: programmeDetail.items[0].badgelinks
                                };
                            })
                        );
                    }
                    return []; // Ensure we return an array even if there are no items
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

app.get('/api/sections/:sectionId/terms/:termId/events', asyncHandler(async (req, res, next) => {
    const sectionId = parseInt(req.params.sectionId);
    const termId = parseInt(req.params.termId);

    const queries = new Queries();

    // Because OSM isn't limiting the results to the termId supplied, I need to do that here
    const term = (await queries.getTerms(sectionId)).filter(x => x.id === termId)[0];

    const events = (await queries.getEvents(sectionId, termId)).items;
    events.sort((a, b) => new Date(a.date) < new Date(b.date));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const termStartDate = new Date(term.startDate);
    const to = new Date();
    to.setDate(termStartDate.getDate() + 60);
    const upcomingEvents = events.filter(x => {
        const eventDate = parseDate(x.date);
        return eventDate >= today && eventDate <= to;
    }).slice(0, 5);

    return res.json(upcomingEvents);
}));

app.delete('/api/cache', asyncHandler(async (req, res) => {
    // TODO: Delete any stored cache files so they will be re-fetched by the next operation
    res.status(200).json({ message: 'Cache cleared successfully' });
}));

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});