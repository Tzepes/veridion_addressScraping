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

async function loopForPostcodeIfCountry(text = null, countryRegex = null, countryFromURL = null, countryCode = null, postcodeData = null, $, axios) {  
    let postcodeDefaultRegex = /\b\d{5}\b/;
    let postcodeCountryRegex = null;
    if(countryRegex){
        postcodeCountryRegex = new RegExp(countryRegex);
    }
    let postcodeMatch = null;
    let postcode = null;
    let postcodeAPIResponse;

    const postcodeWithLabelRegex = /Postcode\s*([A-Z]{2}\s*\d{4,10})\b/;
    const postcodeRegexWithState = /\b[A-Z]{2}\s*(\d{5})\b/; // capture only the postcode part

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
                break;
            }

            // Look for postcode using default regex
            postcodeMatch = text.match(postcodeCountryRegex);
            if (postcodeMatch) {
                postcode = postcodeMatch[0]; 
                break;
            }

            // Look for postcode using postcodeWithLabelRegex
            const postcodeWithLabelMatch = postcodeWithLabelRegex.exec(text);
            if (postcodeWithLabelMatch && postcodeWithLabelMatch[1]) {
                postcode = postcodeWithLabelMatch[1];
                break;
            }

            // Look for postcode using postcodeRegexWithState
            const postcodeRegexWithStateMatch = postcodeRegexWithState.exec(text);
            if (postcodeRegexWithStateMatch && postcodeRegexWithStateMatch[1]) {
                postcode = postcodeRegexWithStateMatch[1].trim(); 
                break;
            }
        }

        if(postcode){
            // Once a postcode is found, parse into APIs
            let postcodeInfo = await passPostcodeToAPI(postcode, axios, countryFromURL);
            postcodeAPIResponse = postcodeInfo.postcodeAPIResponse;
            return { postcode, postcodeAPIResponse };
        }
    }
    return { postcode, postcodeAPIResponse }; 
}

async function passPostcodeToAPI(postcode, axios, countryFromURL) {
    let postcodeAPIResponse;
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

        data.results[postcode].forEach(postcodeInfo => {
            if(postcodeInfo.country_code == countryCode) { 
                return postcodeInfo;
            }
        })
        
        if(!country || country === 'Unknown' || country !== 'United States'){ // US is asigned automatically to country if url is .com
                                                                              // ignore US to asing to postcode country
            country = data.results[postcode][0].country_code;
        }
    }

    return data?.results[postcode][0];
}

module.exports = {loopForPostcodeIfCountry};