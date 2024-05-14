const {getDataFromParseAPI, getDataFromZipcodeBase} = require('../apis/postalcodeParseAPI.js');
const { getCountryAbbreviation } = require('../countriesCodes.js');

const fs = require('fs');

async function loopForPostcodeIfCountry(text = null, countryRegex = null, countryFromURL = null, countryCode = null, postcodeData = null, $) {  
    let postcodeDefaultRegex = /\b\d{5}\b/; // use a defalt regex that could match most postcodes
    let postcodeCountryRegex = null;
    if(countryRegex){
        postcodeCountryRegex = new RegExp(countryRegex); // get the zipcode regex format based on the country
    }
    let postcodeMatch = null;
    let postcode = null;
    let postcodeAPIResponse;
    let matchingPostcodes = new Set();
    const addressSelectors = ['address', 'p', 'font', 'span', 'div'];
    const filteredElements = $('body').find('*').not('script, link, meta, style, path, symbol, noscript, img');
    const reversedElements = $(filteredElements).get().reverse(); // reverse the webpage elements since most postcodes are at the base of the page

    let textGlobalVar;

    // Start search for postcode
    // we insert each matching string of numbers into a Set() array, then we loop them until the valid postcode is found
    for(let index = 0; index < reversedElements.length; index++) {
        const element = reversedElements[index];
        if ($(element).is('script') || $(element).find('script').length > 0 || $(element).find('style').length > 0){
            continue;
        }

        let text = elementTextCleanUp(element, $);
        text = textCleanUp(text);

        postcodeMatch = text.match(postcodeDefaultRegex);
        if (postcodeMatch) {
            postcode = postcodeMatch[0];
            matchingPostcodes.add(postcode);
            textGlobalVar = text;
            // continue;
        }
        
        // Look for postcode using country regex
        postcodeMatch = text.match(postcodeCountryRegex);
        if (postcodeMatch) {
            postcode = postcodeMatch[0]; 
            matchingPostcodes.add(postcode);
            textGlobalVar = text;
            // continue;
        }
    }

    let uniquePostcodes = Array.from(matchingPostcodes);
    console.log(uniquePostcodes);

    for (let postcodeOfArr of uniquePostcodes) { // check each matching string
        let postcodeInfo = await passPostcodeToAPI(postcodeOfArr, countryFromURL);
        postcodeAPIResponse = postcodeInfo.postcodeAPIResponse;
        console.log(postcodeAPIResponse);
        if(postcodeAPIResponse == null){
            postcode = null;
        } else {
            console.log('postcode found:', postcodeOfArr);
            postcode = postcodeOfArr;
            fs.appendFile('matchesFromPostcode.txt', `${textGlobalVar}\n`, (err) => {
                if (err) throw err;
            });
            return { postcode, postcodeAPIResponse };
        }
    }
}

async function passPostcodeToAPI(postcode, countryFromURL) {
    let postcodeAPIResponse;
    
        // postcode is first passed trough ParseAPI which is free and only for US postcodes
        // if no data retrieved off ParseAPI, it could be invalid or non US, thereforse we try zipcodebase which is worldwide but paid, so we limit requests
    try {
        postcodeAPIResponse = await getPostcodeDataParseAPI(postcode, countryFromURL);
    } catch(error) {
        postcodeAPIResponse = null;
        console.log('erronus postcode for API');
    }
    if(!postcodeAPIResponse) { // check logic here it should not trigger if postcodeAPIResponse succeded
        try {
            postcodeAPIResponse = await getZipcodeBaseAPI(postcode, countryFromURL);
        } catch(error) {
            postcodeAPIResponse = null;
            console.log('erronus postcode for API');
            console.log(error);
        }
        
    }
    
    return {postcode, postcodeAPIResponse};
}

async function getPostcodeDataParseAPI(postcode, countryFromURL) { // parsecodeAPI
    let data;

    if (postcode) {
        data = await getDataFromParseAPI(postcode);
        if(countryFromURL !== data?.country?.name && countryFromURL !== null){
            return null;
        } else {
            return data;
        }
    }
    return null;
}

async function getZipcodeBaseAPI(postcode, country) { // pass country code as parametere if needed
    let data;
    data = await getDataFromZipcodeBase(postcode)
    if (data.results[postcode] && data.results[postcode].length > 0) {
        if (data.results[postcode].length === 1) {
            return data.results[postcode][0];
        } else {
            let countryCode = getCountryAbbreviation(country);
            for (let postcodeInfo of data.results[postcode]) { // zipcodebase API could return multiple JSON objects for the same zipcode, therefore we loop trough them until country of postcode matches
                if (postcodeInfo.country_code === countryCode) {
                    return postcodeInfo;
                } else {
                    continue;
                }
            }
        }
    }
    return null;
}

function textCleanUp(text) {
    text = text.replace(/\n|\t/g, " ");      
    text = text.replace(/[\uE017©•"-*|]/g, '').replace(/\s+/g, ' ');
    return text;
}

function elementTextCleanUp(element, $) {
    let text = '';
    $(element).contents().each(function () {
        if (this.type === 'text') text += this.data + ' ';
        else if (this.type === 'tag') text += $(this).text() + ' ';
    });
    return textCleanUp(text);
}

module.exports = {loopForPostcodeIfCountry};