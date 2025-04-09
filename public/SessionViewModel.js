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

    addBadge(badgeViewModel) {
        if (!this.badges().map(b => b.badgeName()).includes(badgeViewModel.badgeName())) {
            this.badges.push(badgeViewModel);
        }
    }
}