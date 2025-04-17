import EventListViewModel from './EventListViewModel.js';

export default class IndexViewModel {
    constructor() {
        this.currentSection = ko.observable();
        this.currentSession = ko.observable();
        this.nextSession = ko.observable();
        this.upcomingEvents = ko.observable();
    }

    setCurrentSection(section) {
        this.currentSection(section);
    }

    setCurrentSession(session) {
        this.currentSession(session);
    }

    setNextSession(session) {
        this.nextSession(session);
    }

    setUpcomingEvents(events) {
        this.upcomingEvents(events);
    }
}
