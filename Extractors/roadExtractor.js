const addressSelectors = [
    '.address',             
    '.contact-info',        
    '.footer-address',      
    'address',              
    '.footer .address',     
    '.footer .contact-info',
    'address .address-block',
];

function findRoad(htmlContent, $) {
    let road = '';

    for (const selector of addressSelectors) {
        const elements = $(selector).text().trim();

        const streetNameRegex = /([^\d]+)\s+(\d+.*)/;
        const matches = elements.match(streetNameRegex);

        if (elements.length > 0) {
            road = matches[1].trim();
            const streetNumber = matches[2].trim();

            road += " " + streetNumber;

            break;
        }
    }

    if(!road) {

    }

    return road;
}

// get all possible matches for road name
    // pass in all matched to geolocator API till positive data is returned

module.exports = findRoad;