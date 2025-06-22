/**
 * View model for badge display
 */
export default class BadgeViewModel {
    /**
     * Create a new badge view model
     * @param {string} sectionName - Name of the scout section
     * @param {string} badgeType - Type of badge
     * @param {string} badgeName - Name of the badge
     */
    constructor(sectionName, badgeType, badgeName) {
        this.sectionName = ko.observable(sectionName);
        this.badgeType = ko.observable(badgeType);
        this.badgeName = ko.observable(badgeName);
        this.badgeImage = ko.observable(this.#badgeUrl(sectionName, badgeType, badgeName));
        this.imageLoaded = ko.observable(true); // default to "loaded"
    }

    /**
     * Handle image load error
     */
    onImageError = () => {
        this.imageLoaded(false);
    };

    /**
     * Generate badge image URL
     * @param {string} sectionName - Name of the scout section
     * @param {string} badgeType - Type of badge
     * @param {string} badgeName - Name of the badge
     * @returns {string} URL for the badge image
     * @private
     */
    #badgeUrl(sectionName, badgeType, badgeName) {
        return `/public/images/badges/${sectionName}/${badgeType}/${badgeName}.png`;
    }
}