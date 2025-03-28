import EventListViewModel from './EventListViewModel.js';

export default class IndexViewModel {
    constructor(section, currentSession, nextSession, upcomingEvents) {
        this.currentSection = ko.observable(section);
        this.currentSession = ko.observable(currentSession);
        this.nextSession = ko.observable(nextSession);
        this.upcomingEvents = ko.observable(upcomingEvents);
    }
}
