export default class SectionViewModel {
    constructor(groupName, sectionType) {
        this.groupName = ko.observable(groupName);
        this.sectionType = ko.observable(sectionType);
    }
}