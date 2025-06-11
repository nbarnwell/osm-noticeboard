export default class BadgeViewModel {
    constructor (sectionName, badgeType, badgeName) {
        this.sectionName = ko.observable(sectionName);
        this.badgeType = ko.observable(badgeType);
        this.badgeName = ko.observable(badgeName);
        this.badgeImage = ko.observable(this.#badgeUrl(sectionName, badgeType, badgeName));
        this.imageLoaded = ko.observable(true); // default to "loaded"
    }

    // Public method to be called when <img> fails
    onImageError = () => {
        this.imageLoaded(false);
    }

    #badgeUrl(sectionName, badgeType, badgeName) {
        return `/public/images/badges/${sectionName}/${badgeType}/${badgeName}.png`;
    }
}