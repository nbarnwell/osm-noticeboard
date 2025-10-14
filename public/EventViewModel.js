/**
 * View model for a single event
 */
export default class EventViewModel {
    /**
     * Create a new event view model
     * @param {string} title - Event title
     * @param {string} date - Event date
     * @param {string} location - Event location
     * @param {string} cost - Event cost
     */
    constructor(title, date, location, cost) {
        this.title = ko.observable(title);
        this.date = ko.observable(date);
        this.location = ko.observable(location);
        this.cost = ko.observable(cost);
        
        // Computed observable to format cost as currency
        this.formattedCost = ko.computed(() => {
            const costValue = this.cost();
            if (costValue === null || costValue === undefined || costValue === '') {
                return '';
            }
            
            // Convert to number and format as currency
            const numericCost = parseFloat(costValue);
            if (isNaN(numericCost)) {
                return costValue; // Return original if not a number
            }
            
            return `£${numericCost.toFixed(2)}`;
        });
    }
}