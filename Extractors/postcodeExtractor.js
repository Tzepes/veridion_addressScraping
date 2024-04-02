const {getDataFromParseAPI, getDataFromZipcodeBase} = require('../apis/postalcodeParseAPI.js');
const { getCountryAbbreviation } = require('../countriesCodes.js');

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

async function findPostcode(text, countryRegex, Country = null, $ = null, axios) { // function can be removed and use loopForPostcodeIfCountry instead
    //Things to check for: 
    // some states are spelled fully, such as Ohio instead of OH
    // could return country based on postal code in most cases
    
    let postalcodeFormat = new RegExp(countryRegex);
    let postcodeAPIResponse;
    const postcodeWithLabelRegex = /Postcode\s*([A-Z]{2}\s*\d{4,10})\b/;
    const postcodeRegexWithState = /\b[A-Z]{2}\s*(\d{5})\b/; // capture only the postcode part

    let postcodeMatch = postalcodeFormat ? postalcodeFormat.exec(text) : null;
    postcode = postcodeMatch && postcodeMatch[1] ? postcodeMatch[1] : null;

    // Look for postcode
    if(!postcode) {
        postcodeMatch = postcodeWithLabelRegex.exec(text);
        if (postcodeMatch && postcodeMatch[1]) {
            postcode = postcodeMatch[1];
        } 
        if(!postcode){
            postcodeMatch = postcodeRegexWithState.exec(text);
            if (postcodeMatch && postcodeMatch[1]) {
                postcode = postcodeMatch[1].trim(); 
            }
        }
    }

    // Pass postcode into APIS
    if(postcode){
        try {
            postcodeAPIResponse = await getPostcodeDataParseAPI(postcode, axios, Country);
        } catch(error) {
            postcodeAPIResponse = null;
            console.log('erronus postcode for API');
        }
        if(!postcodeAPIResponse){
            try {
                postcodeAPIResponse = await getZipcodeBaseAPI(postcode, axios, Country);
                if(!postcodeAPIResponse[postcode]){
                    postcode = null;
                }
            } catch(error) {
                console.log(error);
            }
        }
    }
    
    return {postcode, postcodeAPIResponse};
}

async function loopForPostcodeIfCountry(text = null, countryRegex = null,  countryFromURL = null, countryCode = null, postcodeData = null, $, axios) {  
    let postcodeDefaultRegex = /\b\d{5}\b/;
    if(countryRegex){
        postcodeDefaultRegex = new RegExp(countryRegex);
    }
    let postcodeMatch = null;
    let postcode = null;
    let postcodeFound = false;

    let postcodeAPIResponse;

    const filteredElements = $('body').find('*').not('script, link, meta, style, path, symbol, noscript');
    const reversedElements = $(filteredElements).get().reverse(); // reverse the webpage elements since most postcodes are at the base of the page

    // Start search for postcode
    for(const selector of postcodeSelectors) { 
        for(let index = 0; index < reversedElements.length; index++) {
            const element = reversedElements[index];
            if ($(element).is('script') || $(element).find('script').length > 0) {
                continue;
            }
            const text = $(element).text();
            postcodeMatch = text.match(postcodeDefaultRegex);
            if (postcodeMatch) {
                postcode = postcodeMatch[0]; 
                // once a match is found, parse into APIs
                // check if postcode is valid
                try {
                    postcodeAPIResponse = await getPostcodeDataParseAPI(postcode, axios, countryFromURL);
                } catch(error) {
                    postcodeAPIResponse = null;
                    console.log('erronus postcode for API');
                }
                
                if(!postcodeAPIResponse || ((postcodeAPIResponse?.country?.name !== countryFromURL) && countryFromURL !== null)) {
                    try {
                        postcodeAPIResponse = await getZipcodeBaseAPI(postcode, axios, countryFromURL);
                    } catch(error) {
                        postcodeAPIResponse = null;
                        console.log('erronus postcode for API');
                        console.log(error);
                    }

                }
                return {postcode, postcodeAPIResponse};
            }
        }

        if(postcodeFound){
            break;
        }
    }
    return {postcode, postcodeAPIResponse}; 
}

async function getPostcodeDataParseAPI(postcode, axios, countryFromURL) { // parsecodeAPI
    let data;

    if (postcode) {
        data = await getDataFromParseAPI(postcode, axios);
        if(countryFromURL !== data?.country?.name && countryFromURL !== null){
            return null;
        } else {
            return data;
        }
    } else { 
        return null;
    }
}

async function getZipcodeBaseAPI(postcode, axios, country) { // pass country code as parametere if needed
    let data;
    
    let countryCode = getCountryAbbreviation(country);
    if (postcode) {
        data = await getDataFromZipcodeBase(postcode, axios)

        data.results[postcode].forEach(location => {
            if(location.country_code == countryCode) { // Change country to countryCode from countriesCodes.js
                return location;
            }
        })
        
        if(!country || country === 'Unknown'){
            country = data.results[postcode][0].country_code;
        }
    }

    return data?.results[postcode][0];
}

module.exports = {findPostcode, loopForPostcodeIfCountry};