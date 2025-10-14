/**
 * View model for a scout session
 */
export default class SessionViewModel {
    /**
     * Create a new session view model
     * @param {string|number} id - Session ID
     * @param {string} title - Session title
     * @param {string} date - Session date
     * @param {string} startTime - Start time
     * @param {string} endTime - End time
     * @param {string} notesForParents - Notes for parents
     * @param {number} parentsRequired - Number of parents required
     */
    constructor(id, title, date, startTime, endTime, notesForParents, parentsRequired) {
        this.id = ko.observable(id);
        this.title = ko.observable(title);
        this.date = ko.observable(date);
        this.startTime = ko.observable(startTime);
        this.endTime = ko.observable(endTime);
        this.notesForParents = ko.observable(notesForParents);
        this.parentsRequired = ko.observable(parentsRequired);
        this.badges = ko.observableArray([]);
    }

    /**
     * Add a badge to the session if not already present
     * @param {BadgeViewModel} badgeViewModel - Badge to add
     */
    addBadge(badgeViewModel) {
        if (!this.badges().map(b => b.badgeName()).includes(badgeViewModel.badgeName())) {
            this.badges.push(badgeViewModel);
        }
    }
}