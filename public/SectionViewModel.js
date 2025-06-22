/**
 * View model for a scout section
 */
export default class SectionViewModel {
    /**
     * Create a new section view model
     * @param {string} groupName - Name of the scout group
     * @param {string} sectionType - Type of section (Beavers, Cubs, etc.)
     * @param {string} sectionLogo - Path to the section logo image
     */
    constructor(groupName, sectionType, sectionLogo) {
        this.groupName = ko.observable(groupName);
        this.sectionType = ko.observable(sectionType);
        this.sectionLogo = ko.observable(sectionLogo);
    }
}