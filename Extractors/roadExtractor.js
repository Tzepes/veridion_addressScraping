const addressSelectors = [
    'p', 'span', 'div'
];

function findRoad(htmlContent, $) {
    let road = '';
    let streetNumber = '';
    // add google API to translate road name to country (if taken from URL or Postcode)
    const streetNameRegex = /\b(\d+)\s+(.{1,40})\b(?:\s+(?:Street|St\.|Avenue|Ave\.|Road|Rd\.|Lane|Ln\.|Boulevard|Blvd\.|Drive|Dr\.|Court|Ct\.|Place|Pl\.|Square|Sq\.|Trail|Tr\.|Parkway|Pkwy\.|Circle|Cir\.|Terrace|Ter\.|Way|W\.|Highway|Hwy\.|Route|Rte\.|Path|Pth\.|Expressway|Expy\.|Freeway|Fwy\.|Turnpike|Tpke\.|Interstate|I-(?:[0-9]+)|US(?: Route)?-[0-9]+)\b)(?!.*(?:Categories|Powered by))/
    const streetRegex = /(?:<[^>]+>)*([\w\s]+)\s+(\d+\s*\w*)\s*(?:<[^>]+>)*/;
    for (const selector of addressSelectors) {
        const elements = $(selector).not('script, style, link, meta, path, symbol, noscript');

        elements.each((index, element) => {
            const text = $(element).text().trim();

            const matches = text.match(streetNameRegex);
            // take road
                // pass trough geolocator API
                    // if valid road
                        // if same postcode with api postcode
                            // return road
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
    // pass in all matched to geolocator API till positive data is returned

module.exports = findRoad;