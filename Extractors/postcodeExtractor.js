const getDataFromPostalCode = require('../apis/postalcodeParseAPI.js');

const postcodeSelectors = [
    'footer',        
    '.address',             
    '.contact-info',
    '.footer-address',      
    '.footer .address',     
    '.footer .contact-info',
    '.address-block',
    'address .address-block',
];

function findPostcode(text, countryRegex, Country = null, $ = null) {
    //Things to check for: 
    // some states are spelled fully, such as Ohio instead of OH
    // could return country based on postal code in most cases
    let postalcodeFormat = new RegExp(countryRegex);

    const postcodeWithLabelRegex = /Postcode\s*([A-Z]{2}\s*\d{4,10})\b/;
    const postcodeRegexWithState = /\b[A-Z]{2}\s*(\d{5})\b/; // capture only the postcode part
    
    let postcodeMatch = postalcodeFormat ? postalcodeFormat.exec(text) : null;
    postcode = postcodeMatch && postcodeMatch[1] ? postcodeMatch[1] : null;

    if(!postcode) {
        postcodeMatch = postcodeWithLabelRegex.exec(text);
        if (postcodeMatch && postcodeMatch[1]) {
            postcode = postcodeMatch[1];
        } else {
            postcodeMatch = postcodeRegexWithState.exec(text);
            if (postcodeMatch && postcodeMatch[1]) {
                postcode = postcodeMatch[1].trim(); 
            }
            if (!postcode) {
                loopForPostcodeIfCountry(null, null, $);
            }
        }
    }

  return postcode;
}

async function loopForPostcodeIfCountry(text = null, countryFromURL = null, $) {
    // if postcode found and country from URL doesnt match country from postcode API
    // until looped trough whole webpage
        // loop trough JSON of postcode API till country matchs
            // if no match found, find the next number matching postcode regex
                // if country no match, begin loop again

    // if county match remember code
        // if remembered postcode retursn no city or region from API
            // find next postcode but remember the last one found
                // if no other postcode found, return the last one found
    const postcodeDefaultRegex = /\b\d{5}\b/;
    let postcodeMatch = null;
    let postcode = null;
    let postcodeFound = false;

    let postcodeAPIResponse;

    const filteredElements = $('body').find('*').not('script, link, meta, style');
    const reversedElements = $(filteredElements).get().reverse(); // reverse the webpage elements since most postcodes are at the base of the page

    for(const selector of postcodeSelectors) {
        $(reversedElements).each((index, element) => {
            const text = $(element).text();
            postcodeMatch = text.match(postcodeDefaultRegex);
            if (postcodeMatch) {
                postcode = postcodeMatch[0];
                postcodeFound = true;
                return false; // Exit the loop after finding the first postcode
            }
        });

        if(postcodeFound){
            break;
        }
    }
    return postcode;
}

function searchTroughSelectors(text, $) {

}

module.exports = {findPostcode, loopForPostcodeIfCountry};