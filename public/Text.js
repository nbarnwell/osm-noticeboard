export default function toTitleCase(str) {
    const exceptions = ["a", "and", "but", "for", "nor", "of", "on", "or", "so", "the", "to", "up", "yet", "with"];
    
    return str || ""
        .toLowerCase()  // Convert entire string to lowercase
        .split(" ")      // Split the string into words
        .map((word, index) => {
            // Capitalize the first and last words, or if the word is not in the exceptions list
            if (index === 0 || index === str.split(" ").length - 1 || !exceptions.includes(word)) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            } else {
                return word; // Leave the word as is if it's in the exceptions list
            }
        })
        .join(" "); // Join the words back into a single string
}