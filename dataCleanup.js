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
    return text;
}

module.exports = { elementTextCleanUp, textCleanUp };