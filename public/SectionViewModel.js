export default class SectionViewModel {
    constructor(groupName, sectionType, sectionLogo) {
        this.groupName = ko.observable(groupName);
        this.sectionType = ko.observable(sectionType);
        this.sectionLogo = ko.observable(sectionLogo);
    }
}