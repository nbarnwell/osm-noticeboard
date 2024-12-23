import EventViewModel from './EventViewModel.js'

export default class EventListViewModel {
    constructor() {
        this.eventList = ko.observableArray();
        this.addEvent("Event 1");
        this.addEvent("Event 2");
        this.addEvent("Event 3");
    }

    addEvent(title) {
        this.eventList.push(new EventViewModel(title));
    }
}