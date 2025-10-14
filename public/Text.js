/**
 * Converts a string to title case, with special handling for common small words
 * @param {string} str - The string to convert
 * @returns {string} The string converted to title case
 */
export default function toTitleCase(str) {
    // Handle null or undefined input
    str = str || "";
    
    const exceptions = ["a", "and", "but", "for", "nor", "of", "on", "or", "so", "the", "to", "up", "yet", "with"];
    
    return str
        .toLowerCase()  // Convert entire string to lowercase
        .split(" ")     // Split the string into words
        .map((word, index, words) => {
            // Capitalize the first and last words, or if the word is not in the exceptions list
            if (index === 0 || index === words.length - 1 || !exceptions.includes(word)) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            } else {
                return word; // Leave the word as is if it's in the exceptions list
            }
        })
        .join(" "); // Join the words back into a single string
}