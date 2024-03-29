const addressSelectors = [
    '.address',             
    '.contact-info',        
    '.footer-address',      
    'address',              
    '.footer .address',     
    '.footer .contact-info' 
];

function findRoad(text) {
    let roadName = null;

    for (const selector of addressSelectors) {
        const match = text.match(new RegExp(`<[^>]*${selector.replace('.', '')}[^>]*>(.*?)</[^>]*${selector.replace('.', '')}[^>]*>`, 'i'));
        if (match) {
            roadName = match[1].trim();
            break;
        }
    }

    if (!roadName) {
        const streetPattern = /\b\d+\s[A-Za-z]+\s(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Boulevard|Blvd|Drive|Dr)\b/g;
        const matches = text.match(streetPattern);
        if (matches && matches.length > 0) {
            roadName = matches[0].trim();
        }
    }
}

module.exports = findRoad;