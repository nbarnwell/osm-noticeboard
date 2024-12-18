import EventListViewModel from './EventListViewModel.js';
import EventViewModel from './EventViewModel.js'
import SessionViewModel from './SessionViewModel.js'

export default class IndexViewModel {
    constructor() {
        this.currentSession = ko.observable(new SessionViewModel("Current session"));
        this.nextSession = ko.observable(new SessionViewModel("Next session"));
        this.upcomingEvents = new EventListViewModel();

        this.upcomingEvents.addEvent("Upcoming event 1");
        this.upcomingEvents.addEvent("Upcoming event 2");
        this.upcomingEvents.addEvent("Upcoming event 3");
    }
}
