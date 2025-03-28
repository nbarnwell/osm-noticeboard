export default class EventViewModel {
    constructor(title, date) {
        this.title = ko.observable(title);
        this.date = ko.observable(date);
    }
}