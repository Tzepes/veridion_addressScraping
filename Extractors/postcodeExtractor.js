const {getDataFromParseAPI, getDataFromZipcodeBase} = require('../apis/postalcodeParseAPI.js');
const { getCountryAbbreviation } = require('../utils/countriesCodes.js');

const {fetchStreetDetails, fetchGPEandORG} = require('../apis/spacyLocalAPI.js');

const {elementTextCleanUp, textCleanUp, removeNonAddressDetails} = require('../utils/dataCleanup.js');
const {getTokenRules} = require('../utils/textCleanupByRule.js');
const fs = require('fs');

let country;
let GPEs_inPage;

async function loopForPostcodeIfCountry(pageText, countryRegex = null, countryFromURL = null, $, targetTag = 'body') {  
    let postcodeDefaultRegex = /\b\d{5}\b/; // use a defalt regex that could match most postcodes
    let postcodeCountryRegex = null;
    if(countryRegex){
        postcodeCountryRegex = new RegExp(countryRegex); // get the zipcode regex format based on the country
    }
    country = countryFromURL;
    let postcodeMatch = null;
    let postcode = null;
    let postcodeAPIResponse;
    let matchingPostcodes = new Set();
    const addressSelectors = ['p', 'address', 'font', 'span', 'strong', 'div'];
    const filteredElements = $(targetTag).find('*').filter(function() { return !/^(script|link|meta|style|path|symbol|noscript|img|code)$/i.test(this.nodeName) });
    const reversedElements = $(filteredElements).get().reverse(); // reverse the webpage elements since most postcodes are at the base of the page

    let postcodeTextLocation = {};

    console.log('country and its regex:', countryFromURL, postcodeCountryRegex)

    // Start search for postcode
    // we insert each matching string of numbers into a Set() array, then we loop them until the valid postcode is found
    // Loop through each address selector
    for(let i = 0; i < addressSelectors.length; i++) {
        // Find all elements that match the current address selector
        const elements = $(targetTag).find(addressSelectors[i]);

        // Loop through each element that matches the current address selector
        elements.each(function() {
            const element = this;

            // Skip if the element is a script or contains a script or style
            if ($(element).is('script') || $(element).find('script').length > 0 || $(element).find('style').length > 0){
                return;
            }

            let text = elementTextCleanUp(element, $);
            text = textCleanUp(text);

            let postcodeMatch = text.match(postcodeDefaultRegex);
            if (postcodeMatch) {
                handlePostcodeMatch(postcodeMatch, matchingPostcodes, postcodeTextLocation, element, text);
                // return;
            }

            // Look for postcode using country regex
            postcodeMatch = text.match(postcodeCountryRegex);
            if (postcodeMatch) {
                handlePostcodeMatch(postcodeMatch, matchingPostcodes, postcodeTextLocation, element, text);
                // return;
            }
        });
    }

    let uniquePostcodes = Array.from(matchingPostcodes);
    console.log(uniquePostcodes);

    for (let postcodeOfArr of uniquePostcodes) { // check each matching string
        
        let PostcodeObject = await VerifyPostcode(postcodeOfArr, countryFromURL);
        const countryCode = PostcodeObject?.postcodeAPIResponse?.country_code || PostcodeObject?.postcodeAPIResponse?.country?.alpha2;
        postcode = PostcodeObject?.postcode;
        
        if(!postcode) continue;
        
        let addressDetails = await VerifyTextOfPostcode(postcodeTextLocation, postcodeOfArr, countryCode, $);
        if(postcode){ //
            // verifiy if the postcode is the one of the comany or if it s in the same text but regex matched wrong code
            // if(!(await postcodeDetailsInPage(pageText, PostcodeObject.postcodeAPIResponse))) {
            //     if(addressDetails.Zipcode != postcode){
            //         PostcodeObject = await VerifyPostcode(addressDetails.Zipcode, countryFromURL);
            //         if(!(await postcodeDetailsInPage(pageText, PostcodeObject.postcodeAPIResponse))){
            //             continue;
            //         } else {
            //             postcode = addressDetails.Zipcode;
            //         }
            //     }
            // }
            console.log('address found:', addressDetails)

            fs.appendFile('matchesFromPostcode.txt', `${postcodeTextLocation[postcode].elements[0]}\n${postcodeTextLocation[postcode].texts[0]}\n\n`, (err) => {
                if (err) throw err;
            });
            country = '';
            GPEs_inPage = null;
            return {postcode: postcode, postcodeAPIResponse: PostcodeObject.postcodeAPIResponse, addressDetails};
        }
    }
}

function handlePostcodeMatch(postcodeMatch, matchingPostcodes, postcodeTextLocation, element, text) {
    let postcode = postcodeMatch[0];
    matchingPostcodes.add(postcode);
    if (!postcodeTextLocation[postcode]) {
        postcodeTextLocation[postcode] = {elements: [], texts: []};
    }
    postcodeTextLocation[postcode].elements.push(element.name);
    postcodeTextLocation[postcode].texts.push(text);
}

async function VerifyPostcode(_postcodeToVerify, countryFromURL){
    let response = await passPostcodeToAPI(_postcodeToVerify, countryFromURL);
    let postcodeAPIResponse = response.postcodeAPIResponse;
    if(postcodeAPIResponse == null){
        postcode = null;
        return null;
    } else {
        console.log('postcode found:', _postcodeToVerify);
        return { postcode: _postcodeToVerify, postcodeAPIResponse};
    }
}

async function postcodeDetailsInPage(pageText, postcodeAPIResponse) {
    if(!GPEs_inPage){
        GPEs_inPage = await fetchGPEandORG(pageText).GPE;
    }
    if(GPEs_inPage){
        let city = postcodeAPIResponse.city || postcodeAPIResponse.city?.name;
        let region = postcodeAPIResponse.state || postcodeAPIResponse.state?.name;

        if(GPEs_inPage.includes(city) || GPEs_inPage.includes(region)){
            return true;
        } else {
            return false;
        }
    }
}

// Function to count tokens in a string
function countTokens(str) {
    return str.split(/[\s,.;]+/).length;
}

async function VerifyTextOfPostcode(postcodeTextLocation, postcode, countryCode, $){
    let data = postcodeTextLocation[postcode];
    let element;
    let text;
    let addressInPageTxt;
    let addressInPageTxtBackup;
    let addressText;
    let tokenRules = getTokenRules(countryCode);
    console.log('country code:', countryCode, tokenRules)
    // Combine the texts and elements into an array of objects
    let combined = data.texts.map((text, i) => ({ text, element: data.elements[i] }));

    // Sort the combined array based on token count in the text
    combined.sort((a, b) => countTokens(a.text) - countTokens(b.text));

    console.log('combined:', combined)

    // Split the combined array back into texts and elements arrays
    data.texts = combined.map(item => item.text);
    data.elements = combined.map(item => item.element);
    
    for (let i = 0; i < data.texts.length; i++) {
        element = $(data.elements[i]);
        text = data.texts[i];
        // addressInPageTxt = traverseElement(element, text, minNum, maxNum, postcode, $);

        addressInPageTxt = textCleanUp(text);
        addressInPageTxt = removeNonAddressDetails(addressInPageTxt, postcode);

        let tokenCount = countTokens(addressInPageTxt);

        if(tokenCount < tokenRules.minNumberOfTokens){
            addressInPageTxt = shortenText(postcode, addressInPageTxt, tokenRules);
            tokenRules.takeAmmountOfTokens += 2;
            addressInPageTxtBackup = shortenText(postcode, addressInPageTxt, tokenRules);
        }
        // if(await isValidAddressText(addressInPageTxt) == false){
        //     return null;
        // }

        // Call fetchStreetDetails API and break the loop if it returns street_name and street_number
        let addressDetails = await fetchStreetDetails(addressInPageTxt, countryCode);
        let addressDetailsBackup = await fetchStreetDetails(addressInPageTxtBackup, countryCode);

        console.log(addressDetails)

        if (addressDetails.Street_Name && addressDetails.Street_Num) {
            addressText = addressInPageTxt;

            return addressDetails;
        } else if(addressDetailsBackup.Street_Name && addressDetailsBackup.Street_Num){
            addressText = addressInPageTxtBackup;

            return addressDetailsBackup;
        }
    }
}

async function isValidAddressText(addressInPageTxt){
    const gpeAndOrgDetails = await fetchGPEandORG(addressInPageTxt.text);
    let GPEs = gpeAndOrgDetails.GPE;

    if(GPEs.length == 0){
        return flase;
    } else {
        return true;
    }
}

function traverseElement(element, text, postcode, $) {
    let minNum = 3;
    let maxNum = 15;
    let currentElement = $(element);
    let currentText = text;

    // Split the text into tokens
    let tokens = currentText.split(/[\s,.;-_!@#$%^&*()]+/);
    let iterations = 0;
    const maxIterations = 10;
    // Traverse up or down the hierarchy to adjust the token count
    while ((tokens.length <= minNum || tokens.length >= maxNum) && iterations < maxIterations) {
        if (tokens.length >= maxNum) {
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
        } 
        else if (tokens.length <= minNum) {
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

function shortenText(postcode, text, tokenRules = {minNumberOfTokens: 6, maxNumberOfTokens: 15, takeAmmountOfTokens: 10,}) {
    // based on rule, take n tokens from postcode to left/right, or n/2 from both sides
    // Find the position of the postcode in the text
    const index = text.indexOf(postcode);

    // Check if the postcode was found
    if (index !== -1) {
        // Extract the substring from the start to the index of the postcode
        const substringBeforePostcode = text.substring(0, index + postcode.length);

        // Split the substring into words
        const words = substringBeforePostcode.split(/\s+/);

        // Calculate the start index for slicing, ensure it doesn't go negative
        const startIndex = Math.max(0, words.length - tokenRules.takeAmmountOfTokens - 1); // Subtract 1 to exclude the postcode itself

        if (startIndex < tokenRules.minNumberOfTokens) {
            let substringAfterPostcode = text.substring(index);
            let wordsAfter = substringAfterPostcode.split(/\s+/);
            // Check if the right side satisfies minNumberOfTokens
            if (wordsAfter.length >= tokenRules.minNumberOfTokens) {
                let resultWordsAfter = wordsAfter.slice(0, tokenRules.minNumberOfTokens);

                return resultWordsAfter.join(' ');
            }

            let resultWords = words.slice(startIndex);

            return resultWords.join(' ');
        }
    } else {
        // Postcode not found in text
        console.log('Postcode not found in text');
        return text;
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

    if (postcodeAPIResponse === null) {
        postcode = null;
    }
    
    console.log(postcode, postcodeAPIResponse)

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
    let data; //TODO: take country, region and city from API, and search for it in Page text to verifiy it's validity, give points to each match and return the one with most points
    data = await getDataFromZipcodeBase(postcode)
    if (data.results[postcode] && data.results[postcode].length > 0) {
        if (data.results[postcode].length === 1 && data.results[postcode][0].latitude !== "0.00000000" && data.results[postcode][0].longitude !== "0.00000000") { // If long and lat = 0 it can mean dummy data
            return data.results[postcode][0];
        } else {
            let countryCode = getCountryAbbreviation(country);
            for (let postcodeInfo of data.results[postcode]) { // zipcodebase API could return multiple JSON objects for the same zipcode, therefore we loop trough them until country of postcode matches
                if (postcodeInfo.country_code === countryCode && postcodeInfo.latitude !== "0.00000000" && postcodeInfo.longitude !== "0.00000000") {
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