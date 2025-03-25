import EventListViewModel from './EventListViewModel.js';

export default class IndexViewModel {
    constructor(section, currentSession, nextSession) {
        this.currentSection = ko.observable(section);
        this.currentSession = ko.observable(currentSession);
        this.nextSession = ko.observable(nextSession);
        this.upcomingEvents = new EventListViewModel();
    }
}
