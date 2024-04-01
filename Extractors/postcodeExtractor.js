const {getDataFromParseAPI, getDataFromZipcodeBase} = require('../apis/postalcodeParseAPI.js');

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

function findPostcode(text, countryRegex, Country = null, $ = null) { // function can be removed and use loopForPostcodeIfCountry instead

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
                loopForPostcodeIfCountry(null, null, null, $);
            }
        }
    }

  return postcode;
}

async function loopForPostcodeIfCountry(text = null, countryFromURL = null, postcodeData = null, $, axios) {
    // V2 search
    // (if postcode data)
    // if country from url doesnt match country from postcode API
        // from parse api to zipcodebase API
            // loop trough JSON objects to find matching country
                // (check for matching city and region name trough webpage)
                // remember the last postcode data
                   // if city/region not found, find next matching postcode



    // we need a loop for postcode search if number is not postcode
    
    // while(countryFromURL !== postcodeData?.country?.name) {

    // }

    // is code checking if postcode is valid ? (check for api error, in which case continue search for postcode until end of page)

    
    // if postcode data received form zipcodebase API AND multiple JSON objects with multiple instances of the same country
        // take city and/or region name and loop trough page to find matching city and/or region name
    
    const postcodeDefaultRegex = /\b\d{5}\b/;
    let postcodeMatch = null;
    let postcode = null;
    let postcodeFound = false;

    let postcodeAPIResponse;

    const filteredElements = $('body').find('*').not('script, link, meta, style, path, symbol, noscript');
    const reversedElements = $(filteredElements).get().reverse(); // reverse the webpage elements since most postcodes are at the base of the page

    for(const selector of postcodeSelectors) { 
        $(reversedElements).each((index, element) => {
            const text = $(element).text();
            postcodeMatch = text.match(postcodeDefaultRegex);
            if (postcodeMatch) {
                postcode = postcodeMatch[0];
                // pass postcode to parse API
                    // if postcode data received then return postcode
                    // else pass trough getZipcodeBaseAPI()
                postcodeFound = true;
                return false; 
            }
        });

        if(postcodeFound){
            break;
        }
    }
    return postcode; // return {postcode, postcodeData} (postcodeObject)
}

function searchTroughSelectors(text, $) {

}

module.exports = {findPostcode, loopForPostcodeIfCountry};