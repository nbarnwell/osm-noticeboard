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
     */
    addEvent(title, date) {
        this.eventList.push(new EventViewModel(title, date));
    }
}