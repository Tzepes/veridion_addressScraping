function elementTextCleanUp(element, $) {
    let text = '';
    $(element).contents().each(function () {
        if (this.type === 'text') {
            // Add trimmed text and a space to separate from the next element
            text += this.data.trim() + ' ';
        } else {
            // Recursively clean up the inner text of child elements
            const childText = elementTextCleanUp(this, $);
            const cleanedChildText = childText.replace(/<img[^>]*>|<iframe[^>]*>|<br>|<p>|<span>/g, ' ');
            // Add the cleaned text and a space to separate from the next element
            text += cleanedChildText + ' ';
        }
    });

    return textCleanUp(text);
}

function textCleanUp(text) {
    text = text.replace(/\n|\t|\n811/g, ' ');      
    text = text.replace(/[\uE017©•*|/]/g, ' ').replace(/\s+/g, ' ');
    text = text.replace(/[^\x20-\x7EäöüßÄÖÜàâéèêëîïôùûüÿçÀÂÉÈÊËÎÏÔÙÛÜŸÇáíóúýčďěňřšťžČĎĚŇŘŠŤŽæøåÆØÅăâîșțĂÂÎȘȚñÑáéíóúü]/g, ' ');
    //Remove CSS and HTML-like content
    text = text.replace(/\w+[-\w]*\s*{[^}]*}/g, ' ');
    
    return text;
}

function removeNonAddressDetails(text, postcode) {
    // Placeholder for the postcode
    const placeholder = 'POSTCODE_PLACEHOLDER';

    // Replace the postcode with the placeholder
    text = text.replace(new RegExp(postcode, 'g'), placeholder);

    // Regex pattern for phone numbers
    const phonePattern = /(\+?\d{1,4}[\s-]?)?(\(?\d{1,3}\)?[\s-]?)?[\d\s-]{7,15}/g;
    // Regex pattern for emails
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const ATwithTextPattern = /\b\w+@\w+\b/g;
    const urlPattern = /https?:\/\/[^\s]+/g;
    
    // Remove phone numbers from text
    text = text.replace(phonePattern, ' ');
    // Remove emails from text
    text = text.replace(emailPattern, ' ');
    text = text.replace(ATwithTextPattern, ' ');
    // Remove links
    text = text.replace(urlPattern, ' ');

    // Replace the placeholder with the original postcode
    text = text.replace(new RegExp(placeholder, 'g'), postcode);

    console.log('done cleaning phones and emails')
    // Return the cleaned text
    return text;
}

function cleanUpFromGPEs(text, GPEs) {
    // Remove GPEs from the text
    for (let GPE of GPEs) {
        console.log('cleaning GPEs')
        text = text.replace(GPE, ' ');
    }
    console.log('done cleaing GPEs');
    return text;
}

function cleanUpStreet(text){
    let cleanedText = text.replace(/[,"]/g, '');
    return cleanedText;
}

module.exports = { elementTextCleanUp, textCleanUp, removeNonAddressDetails, cleanUpFromGPEs, cleanUpStreet };