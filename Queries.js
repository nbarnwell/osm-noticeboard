import OsmClient from './OsmClient.js'

export default class Queries {
    constructor() {
        this.osmClient = new OsmClient();
    }

    getSections = async function () {
        const res = await this.osmClient.getSectionConfig();
        const sectionIds = Object.keys(res).map(x => parseInt(x));

        const sections =
            sectionIds.map(x => {
                const current = res[x];
                return {
                    id: x,
                    groupName: current.portal.charityName,
                    sectionType: current.sectionType,
                    meetingDay: current.meeting_day
                }
            });

        return sections;
    };

    getTermsRaw = async function () {
        const res = await this.osmClient.getTerms();
        return res;
    }

    getTerms = async function () {
        const res = await this.osmClient.getTerms();
        const sectionIds = Object.keys(res).map(x => parseInt(x));

        const terms =
            sectionIds.map(x => res[x])
                .flat()
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

    getProgramme = async function (sectionId, termId) {
        return await this.osmClient.getProgramme(sectionId, termId);
    };

    getProgrammeDetail = async function (sectionId, termId, eveningId) {
        return await this.osmClient.getProgrammeDetail(sectionId, termId, eveningId);
    };

    getEvents = async function (sectionId, termId) {
        return await this.osmClient.getEvents(sectionId, termId);
    };
}