function elementTextCleanUp(element, $) {
    let text = '';
    $(element).contents().each(function () {
        if (this.type === 'text') {
            // Add trimmed text and a space to separate from the next element
            text += this.data.trim() + ' ';
        } else {
            // Recursively clean up the inner text of child elements
            const childText = elementTextCleanUp(this, $);
            const cleanedChildText = childText.replace(/<img[^>]*>|<iframe[^>]*>/g, '');
            // Add the cleaned text and a space to separate from the next element
            text += cleanedChildText + ' ';
        }
    });

    return textCleanUp(text);
}

function textCleanUp(text) {
    text = text.replace(/\n|\t/g, " ");      
    text = text.replace(/[\uE017©•"-*|]/g, '').replace(/\s+/g, ' ');
    text = text.replace(/[^\x20-\x7E]/g, '');
    //Remove CSS and HTML-like content
    text = text.replace(/\w+[-\w]*\s*{[^}]*}/g, '');
    
    return text;
}

function removePhoneNumbersAndEmails(text) {
    // Regex pattern for phone numbers
    const phonePattern = /(\+?\d{1,4}[\s-]?)?(\(?\d{1,3}\)?[\s-]?)?[\d\s-]{7,15}/g;
    // Regex pattern for emails
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    // Remove phone numbers from text
    text = text.replace(phonePattern, '');
    // Remove emails from text
    text = text.replace(emailPattern, '');

    // Return the cleaned text
    return text;
}


module.exports = { elementTextCleanUp, textCleanUp, removePhoneNumbersAndEmails };