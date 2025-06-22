import EventListViewModel from './EventListViewModel.js';

/**
 * Main view model for the index page
 */
export default class IndexViewModel {
    /**
     * Create a new index view model
     */
    constructor() {
        this.currentSection = ko.observable();
        this.currentSession = ko.observable();
        this.nextSession = ko.observable();
        this.upcomingEvents = ko.observable();
    }

    /**
     * Set the current section
     * @param {SectionViewModel} section - Section view model
     */
    setCurrentSection(section) {
        this.currentSection(section);
    }

    /**
     * Set the current session
     * @param {SessionViewModel} session - Session view model
     */
    setCurrentSession(session) {
        this.currentSession(session);
    }

    /**
     * Set the next session
     * @param {SessionViewModel} session - Session view model
     */
    setNextSession(session) {
        this.nextSession(session);
    }

    /**
     * Set the upcoming events
     * @param {EventListViewModel} events - Events list view model
     */
    setUpcomingEvents(events) {
        this.upcomingEvents(events);
    }
}
