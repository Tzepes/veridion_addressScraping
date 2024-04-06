const {getDataFromParseAPI, getDataFromZipcodeBase} = require('../apis/postalcodeParseAPI.js');
const { getCountryAbbreviation } = require('../countriesCodes.js');

async function loopForPostcodeIfCountry(text = null, countryRegex = null, countryFromURL = null, countryCode = null, postcodeData = null, $, axios) {  
    let postcodeDefaultRegex = /\b\d{5}\b/;
    let postcodeCountryRegex = null;
    if(countryRegex){
        postcodeCountryRegex = new RegExp(countryRegex);
    }
    let postcodeMatch = null;
    let postcode = null;
    let postcodeAPIResponse;
    let matchingPostcodes = new Set();

    const filteredElements = $('body').find('*').not('script, link, meta, style, path, symbol, noscript');
    const reversedElements = $(filteredElements).get().reverse(); // reverse the webpage elements since most postcodes are at the base of the page
   
    // Start search for postcode
    for(let index = 0; index < reversedElements.length; index++) {
        const element = reversedElements[index];
        if ($(element).is('script') || $(element).find('script').length > 0) {
            continue;
        }
        const text = $(element).text();
        postcodeMatch = text.match(postcodeDefaultRegex);
        if (postcodeMatch) {
            postcode = postcodeMatch[0];
            matchingPostcodes.add(postcode);
            // continue;
        }
        
        // Look for postcode using country regex
        postcodeMatch = text.match(postcodeCountryRegex);
        if (postcodeMatch) {
            postcode = postcodeMatch[0]; 
            matchingPostcodes.add(postcode);
            // continue;
        }
    }
    let uniquePostcodes = Array.from(matchingPostcodes);
    console.log(uniquePostcodes);
    for (let postcodeOfArr of uniquePostcodes) {
        let postcodeInfo = await passPostcodeToAPI(postcodeOfArr, axios, countryFromURL);
        postcodeAPIResponse = postcodeInfo.postcodeAPIResponse;
        
        if(postcodeAPIResponse == null){
            postcode = null;
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
    if(!postcodeAPIResponse) { // check logic here it should not trigger if postcodeAPIResponse succeded
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
    }
    return null;
}

async function getZipcodeBaseAPI(postcode, axios, country) { // pass country code as parametere if needed
    let data;
    data = await getDataFromZipcodeBase(postcode, axios)
    if (data.results[postcode] && data.results[postcode].length > 0) {
        if (data.results[postcode].length === 1) {
            return data.results[postcode][0];
        } else {
            let countryCode = getCountryAbbreviation(country);
            for (let postcodeInfo of data.results[postcode]) {
                if (postcodeInfo.country_code === countryCode) {
                    return postcodeInfo;
                }
            }
        }
    }
    return null;
}

function setCountryFromPostCode(_country) {
    postcodeCountry = _country;
}

module.exports = {loopForPostcodeIfCountry};