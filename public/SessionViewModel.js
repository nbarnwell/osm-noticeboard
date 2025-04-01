export default class SessionViewModel {
    constructor(id, title, date, startTime, endTime, notesForParents) {
        this.id = ko.observable(id);
        this.title = ko.observable(title);
        this.date = ko.observable(date);
        this.startTime = ko.observable(startTime);
        this.endTime = ko.observable(endTime);
        this.notesForParents = ko.observable(notesForParents);
        this.badges = ko.observableArray([]);
    }

    addBadge(sectionName, badgeName) {
        this.badges.push({
            sectionName: ko.observable(sectionName),
            badgeName: ko.observable(badgeName),
            logoUrl: ko.observable(badgeUrl(sectionName, badgeName)),
        });
    }

    badgeUrl(sectionName, badgeName) {
        return `/images/badges/${sectionName.toLowerCase()}/${badgeName.toLowerCase()}.png`;
    }
}