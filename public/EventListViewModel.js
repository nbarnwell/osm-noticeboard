import EventViewModel from './EventViewModel.js';

/**
 * View model for a collection of events
 */
export default class EventListViewModel {
    /**
     * Create a new event list view model
     */
    constructor() {
        this.eventList = ko.observableArray();
    }

    /**
     * Add an event to the list
     * @param {string} title - Event title
     * @param {string} date - Event date
     * @param {string} startTime - Event start time
     * @param {string} endTime - Event end time
     * @param {string} location - Event location
     * @param {string} cost - Event cost
     */
    addEvent(title, date, startTime, endTime, location, cost) {
        this.eventList.push(new EventViewModel(title, date, startTime, endTime, location, cost));
    }
}