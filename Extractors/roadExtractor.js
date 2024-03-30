const cheerio = require('cheerio');

const addressSelectors = [
    '.address',             
    '.contact-info',        
    '.footer-address',      
    'address',              
    '.footer .address',     
    '.footer .contact-info',
    'address .address-block',
];

function findRoad(htmlContent) {
    let road = '';
    const $ = cheerio.load(htmlContent);

    for (const selector of addressSelectors) {
        const elements = $(selector);

        // Check if any elements were found
        if (elements.length > 0) {
            // Extract the text content of the first element
            const roadText = elements.first().text().trim();

            // Split the road text by newline to separate street name and other details
            const roadLines = roadText.split('\n');

            // The street name is typically the first line
            roadName = roadLines[0].trim();

            // Break the loop if a street name is found
            break;
        }
    }

    if(!road) {

    }

    return road;
}

module.exports = findRoad;