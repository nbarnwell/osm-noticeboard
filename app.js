import express from 'express';
import fs from 'fs';
import path from 'path';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Queries from './Queries.js';
import { getToken, getApiState, clearToken, clearApiState, clearAllState } from './appState.js';
import { DateTime } from 'luxon';
import { start } from 'repl';

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
    const badgeSubFolderName = badgeSubFolder(sectionName, badgeType);
    const badgeFileNameName = badgeFileName(sectionName, badgeType, badgeName);
    const badgeSuffixName = badgeSuffix(sectionName, badgeType);
    return path.join(__dirname, `public`, 'images', 'badges', badgeSubFolderName, `${badgeFileNameName}${badgeSuffixName}.png`);
};

const badgeSuffix = (sectionName, badgeType) => {
    if (sectionName === 'Squirrels') {
        return '';
    }

    return '-RGB'
}

const badgeFileName = (sectionName, badgeType, badgeName) => {
    if (sectionName === 'Squirrels') {
        if (badgeName === 'Story Time') {
            return 'Storytime';
        }

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
                return 'activity-badges-squirrels-zip-download//PNG';
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
            case 'Squirrels':
                return 'activity-badges-squirrels-zip-download//PNG';
            case 'Beavers':
                return 'Challenge Award Badges-Beavers';
            case 'Cubs':
                return 'Challenge Award Badges-Cubs';
            case 'Scouts':
                return '';
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

// Get version from .version file
function getVersion() {
    try {
        const versionFile = path.join(__dirname, '.version');
        if (fs.existsSync(versionFile)) {
            return fs.readFileSync(versionFile, 'utf-8').trim();
        }
        return 'unknown';
    } catch (e) {
        console.error('Error reading version file:', e);
        return 'unknown';
    }
}

app.get('/api/version', (req, res) => {
    res.json({ version: getVersion() });
});

app.get('/api/startup', asyncHandler(async (req, res) => {
    const queries = new Queries();
    const terms = await queries.getStartup();
    res.json(terms);
}));

app.get('/api/termsRaw', asyncHandler(async (req, res) => {
    const queries = new Queries();
    const terms = await queries.getTermsRaw();
    res.json(terms);
}));

app.get('/api/terms', asyncHandler(async (req, res) => {
    const queries = new Queries();
    const terms = await queries.getTerms();
    res.json(terms);
}));

app.get('/api/evenings', asyncHandler(async (req, res) => {
    const queries = new Queries();
    const terms = await queries.getTerms();
    
    const nowParam = req.query.now;
    let now;

    if (nowParam === undefined) {
        now = DateTime.now();
    } else {
        now = DateTime.fromISO(nowParam);
        if (!now.isValid) {
            return res.status(400).json({
                error: "Invalid 'now' parameter",
                message: `The 'now' query parameter must be a valid ISO 8601 date-time string, e.g. 2025-04-03T19:15:00. Current value: '${nowParam}'`
            });
        }
    }

    console.log(`Fetching evenings for current term: ${now.toISO()}`);

    const evenings = (
        await Promise.all(
            terms.filter(term => DateTime.fromISO(term.startDate) <= now && DateTime.fromISO(term.endDate) >= now)
                .map(async term => {
                    const programme = await queries.getProgramme(term.sectionId, term.id);
                    
                    if (programme && Array.isArray(programme.items)) {
                        return Promise.all(
                            programme.items.map(async (evening) => {
                                const programmeDetail = await queries.getProgrammeDetail(term.sectionId, term.id, evening.eveningid);
                                const startDateTime = DateTime.fromISO(evening.meetingdate + 'T' + evening.starttime);
                                const endDateTime = DateTime.fromISO(evening.meetingdate + 'T' + evening.endtime);
                                return {
                                    id: evening.eveningid,
                                    sectionId: evening.sectionid,
                                    termId: term.id,
                                    title: evening.title,
                                    startDateTime: startDateTime,
                                    endDateTime: endDateTime,
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
    
    console.log(`Returning ${evenings.length} evenings for current date: ${now.toISO()}`);
    
    res.json(evenings);
}));

app.get('/api/sections/:id', asyncHandler(async (req, res, next) => {
    const queries = new Queries();
    const sections = await queries.getSections();
    const sectionMap = new Map(sections.map(x => [x.id, x]));
    const id = parseInt(req.params.id);
    const section = sectionMap.get(id);

    if (section) {
        const startupInfo = await queries.getStartup();
        const sectionAdditionalInfo = startupInfo.globals.roles.find(r => r.sectionid == id);
        section.groupName = sectionAdditionalInfo?.groupname || section.groupname;
        section.sectionName = sectionAdditionalInfo?.sectionname || section.sectionname;
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
    events.sort((a, b) => DateTime.fromISO(a.date) < DateTime.fromISO(b.date));
    const now = DateTime.now();
    const today = DateTime.now().startOf('day');
    const termStartDate = DateTime.fromISO(term.startDate);
    const to = termStartDate.plus({ days: 60 });
    const upcomingEvents = events.filter(x => {
        const eventDate = DateTime.fromFormat(x.date, "dd/MM/yyyy");
        return eventDate >= today && eventDate <= to;
    }).slice(0, 5);

    return res.json(upcomingEvents);
}));

app.get('/api/diagnostics', asyncHandler(async (req, res) => {
    const tokenData = await getToken();
    const apiState = await getApiState();
    
    console.log('Diagnostics check - tokenData:', tokenData ? `${tokenData.token.substring(0, 10)}...` : 'null');
    
    const diagnostics = {
        token: tokenData ? tokenData.token.substring(0, 5) : null,
        apiState: apiState
    };
    
    res.status(200).json(diagnostics);
}));

app.post('/api/diagnostics/reset-api-state', asyncHandler(async (req, res) => {
    await clearApiState();
    res.status(200).json({ message: 'API state reset successfully' });
}));

app.post('/api/diagnostics/delete-token', asyncHandler(async (req, res) => {
    await clearToken();
    res.status(200).json({ message: 'Token deleted successfully' });
}));

app.post('/api/diagnostics/clear-cache', asyncHandler(async (req, res) => {
    const cacheDir = path.join(__dirname, 'cache');
    let filesDeleted = 0;
    
    if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        for (const file of files) {
            const filePath = path.join(cacheDir, file);
            const stat = fs.statSync(filePath);
            
            // Only delete .json files, not the database files
            if (stat.isFile() && file.endsWith('.json')) {
                fs.unlinkSync(filePath);
                filesDeleted++;
            }
        }
    }
    
    res.status(200).json({ message: 'Cache cleared successfully', filesDeleted });
}));

app.delete('/api/cache', asyncHandler(async (req, res) => {
    // TODO: Delete any stored cache files so they will be re-fetched by the next operation
    res.status(200).json({ message: 'Cache cleared successfully' });
}));

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port} -----------------------------------------------------------`);
});