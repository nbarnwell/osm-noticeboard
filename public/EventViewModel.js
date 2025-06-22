/**
 * View model for a single event
 */
export default class EventViewModel {
    /**
     * Create a new event view model
     * @param {string} title - Event title
     * @param {string} date - Event date
     */
    constructor(title, date) {
        this.title = ko.observable(title);
        this.date = ko.observable(date);
    }
}