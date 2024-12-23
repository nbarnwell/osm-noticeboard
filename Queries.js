import { URL } from 'url';

export default class Queries {
    constructor(osmToken) {
        this.osmToken = osmToken;
        this.osmRoot = 'https://www.onlinescoutmanager.co.uk'
    }
    
    getSections = async function() {
        const res = await this.callOsm(this.osmToken, 'api.php?action=getSectionConfig');
        const sectionIds = Object.keys(res).map(x => parseInt(x));

        const sections = 
            sectionIds.map(x => {
                const current = res[x];
                return {
                    id: x,
                    sectionType: current.sectionType,
                    meetingDay: current.meeting_day
                }
            });

        return sections;
    };
    
    getTerms = async function() {
        const res = await this.callOsm(this.osmToken, 'api.php?action=getTerms')
        const sectionIds = Object.keys(res).map(x => parseInt(x));

        const terms =
            sectionIds.map(x => res[x])
                .flat()
                .filter(x => x.past === false)
                .map(x => {
                    return {
                        id: parseInt(x.termid),
                        sectionId: parseInt(x.sectionid),
                        name: x.name,
                        startDate: new Date(x.startdate),
                        endDate: new Date(x.enddate)
                    };
                });
        
        return terms;
    };

    getProgramme = async function(sectionId, termId) {
        const res = await this.callOsm(this.osmToken, `ext/programme/?action=getProgramme&sectionid=${parseInt(sectionId)}&termid=${parseInt(termId)}`);
        return res;
    };

    callOsm = async function callOsm(token, url) {
        const fullUrl = new URL(url, this.osmRoot);
        const response = await fetch(fullUrl.toString(), {
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
}