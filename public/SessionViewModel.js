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

    addBadge(badgeName) {
        this.badges.push(badgeName);
    }
}