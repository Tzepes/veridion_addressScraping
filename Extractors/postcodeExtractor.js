const {getDataFromParseAPI, getDataFromZipcodeBase} = require('../apis/postalcodeParseAPI.js');
const { getCountryAbbreviation } = require('../countriesCodes.js');

const {elementTextCleanUp, textCleanUp, removePhoneNumbersAndEmails} = require('../dataCleanup.js');
const fs = require('fs');

async function loopForPostcodeIfCountry(text = null, countryRegex = null, countryFromURL = null, $) {  
    let postcodeDefaultRegex = /\b\d{5}\b/; // use a defalt regex that could match most postcodes
    let postcodeCountryRegex = null;
    if(countryRegex){
        postcodeCountryRegex = new RegExp(countryRegex); // get the zipcode regex format based on the country
    }
    let postcodeMatch = null;
    let postcode = null;
    let postcodeAPIResponse;
    let matchingPostcodes = new Set();
    const addressSelectors = ['address', 'p', 'font', 'span', 'strong','li', 'ul', 'div'];
    const filteredElements = $('body').find('*').not('script, link, meta, style, path, symbol, noscript, img');
    const reversedElements = $(filteredElements).get().reverse(); // reverse the webpage elements since most postcodes are at the base of the page

    let textGlobalVar;
    let elementGlobalVar;
    let postcodeTextLocation = {};

    // Start search for postcode
    // we insert each matching string of numbers into a Set() array, then we loop them until the valid postcode is found
    for(let index = 0; index < reversedElements.length; index++) {
        const element = reversedElements[index];
        if ($(element).is('script') || $(element).find('script').length > 0 || $(element).find('style').length > 0){
            continue;
        }

        for(let i = 0; i < addressSelectors.length; i++) {
            if ($(element).is(addressSelectors[i])) {
                isCorrectElement = true;
                break;
            }
        }

        let text = elementTextCleanUp(element, $);
        text = textCleanUp(text);
        
        // fs.appendFile('postcodeLoopElements.txt', `${element.name}\n${text}\n\n`, (err) => {
        //     if (err) throw err;
        // });
        
        postcodeMatch = text.match(postcodeDefaultRegex);
        if (postcodeMatch) {
            postcode = postcodeMatch[0];
            if (!matchingPostcodes.has(postcode)) { // Check if postcode has already been found
                matchingPostcodes.add(postcode);
                elementGlobalVar = element.name;
                textGlobalVar = text;
                postcodeTextLocation[postcode] = {element: elementGlobalVar, text: textGlobalVar };
            }
            // continue;
        }
        
        // Look for postcode using country regex
        postcodeMatch = text.match(postcodeCountryRegex);
        if (postcodeMatch) {
            postcode = postcodeMatch[0]; 
            if (!matchingPostcodes.has(postcode)) { // Check if postcode has already been found
                matchingPostcodes.add(postcode);
                elementGlobalVar = element.name;
                textGlobalVar = text;
                postcodeTextLocation[postcode] = {element: elementGlobalVar, text: textGlobalVar };
            }
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
            let addressInPageTxt;
            if (postcode) {
                let data = postcodeTextLocation[postcode];
                let element = $(data.element);
                let text = data.text;
                const minNum = 6; // Set this to the minimum number of tokens you want
                const maxNum = 15; // Set this to the maximum number of tokens you want

                addressInPageTxt = traverseElement(element, text, minNum, maxNum, postcode, $);
                addressInPageTxt.text = removePhoneNumbersAndEmails(addressInPageTxt.text);
                fs.appendFile('matchesFromPostcode.txt', `${addressInPageTxt.element[0].name}\n${addressInPageTxt.text}\n\n`, (err) => {
                    if (err) throw err;
                });
            }
            elementGlobalVar = null;
            textGlobalVar = null;
            return { postcode, postcodeAPIResponse, addressInPageTxt};
        }
    }
}

function traverseElement(element, text, minNum, maxNum, postcode, $) {
    let currentElement = $(element);
    let currentText = text;

    // Split the text into tokens
    let tokens = currentText.split(/\s+/);

    let iterations = 0;
    const maxIterations = 3;

    // Traverse up or down the hierarchy to adjust the token count
    while ((tokens.length < minNum || tokens.length > maxNum) && iterations < maxIterations) {
        console.log('traversing postcode elements')
        if (tokens.length > maxNum) {
            // If too many tokens, traverse downwards
            let childElements = currentElement.children();
            let found = false;
            for (let i = 0; i < childElements.length; i++) {
                let childText = $(childElements[i]) ? $(childElements[i]).text() : null;
                if (childText.includes(postcode)) {
                    currentElement = $(childElements[i]);
                    currentText = childText;
                    tokens = currentText.split(/\s+/);
                    found = true;
                    break;
                }
            }
            if (!found) break; // No suitable child found, stop traversing downwards
        } else if (tokens.length < minNum) {
            // If too few tokens, traverse upwards
            let parentElement = currentElement.parent();
            if (parentElement.length === 0) break; // No parent element, stop traversing upwards
            let parentText = parentElement ? parentElement.text() : null;
            if (parentText.includes(postcode)) {
                currentElement = parentElement;
                currentText = parentText;
                tokens = currentText.split(/\s+/);
            } else {
                break; // Parent text does not contain postcode, stop traversing upwards
            }
        }
        iterations++;
    }

    // Ensure the final text contains the postcode and has the correct token count
    // if (currentText.includes(postcode) && tokens.length >= minNum && tokens.length <= maxNum) {
    return { text: currentText, element: currentElement };
    // } else {
    //     return null; // Unable to find suitable text
    // }
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

module.exports = {loopForPostcodeIfCountry};