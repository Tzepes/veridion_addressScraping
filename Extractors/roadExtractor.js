const addressSelectors = [
    'p', 'span', 'div'
];

function findRoad(htmlContent, $) {
    let road = '';
    let streetNumber = '';
    // add google API to translate road name to country (if taken from URL or Postcode)
    const streetNameRegex = /\b(\d+)\s+(.{1,40})\b(?:\s+(?:Street|St\.|Avenue|Ave\.|Road|Rd\.|Lane|Ln\.|Boulevard|Blvd\.|Drive|Dr\.|Court|Ct\.|Place|Pl\.|Square|Sq\.|Trail|Tr\.|Parkway|Pkwy\.|Circle|Cir\.|Terrace|Ter\.|Way|W\.|Highway|Hwy\.|Route|Rte\.|Path|Pth\.|Expressway|Expy\.|Freeway|Fwy\.|Turnpike|Tpke\.|Interstate|I-(?:[0-9]+)|US(?: Route)?-[0-9]+)\b)(?!.*(?:Categories|Powered by))/
    
    for (const selector of addressSelectors) {
        const elements = $(selector).not('script, style, link, meta, path, symbol, noscript');

        elements.each((index, element) => {
            const text = $(element).text().trim();

            const matches = text.match(streetNameRegex);
            // take road
                // pass trough geocoding API
                    // if valid road
                        // if same postcode with api postcode
                            // return road
                        // if no postcode
                            // return postcode, city and region from geocoding API
                    // else
                        // continue search
            if (matches) {
                streetNumber = matches[1].trim();
                road = matches[2].trim();
                return false;
            }
        });

        if (road) {
            break;
        }
    }

    return { streetNumber, road: road || null };
}

// get all possible matches for road name
    // pass in all matched to geocoding API till positive data is returned

module.exports = findRoad;