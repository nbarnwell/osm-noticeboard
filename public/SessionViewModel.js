export default class SessionViewModel {
    constructor(title, date, startTime, endTime, notesForParents) {
        this.title = ko.observable(title);
        this.date = ko.observable(date);
        this.startTime = ko.observable(startTime);
        this.endTime = ko.observable(endTime);
        this.notesForParents = ko.observable(notesForParents);
    }
}