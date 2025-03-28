import EventViewModel from './EventViewModel.js'

export default class EventListViewModel {
    constructor() {
        this.eventList = ko.observableArray();
    }

    addEvent(title, date) {
        this.eventList.push(new EventViewModel(title, date));
    }
}