const {passPostcodeToAPI} = require('../apis/postalcodeAPIs.js');
const { getCountryAbbreviation } = require('../utils/countriesCodes.js');

const {fetchStreetDetails, fetchGPEandORG} = require('../apis/spacyLocalAPI.js');

const {elementTextCleanUp, textCleanUp, removeNonAddressDetails} = require('../utils/dataCleanup.js');
const {getTokenRules} = require('../utils/textCleanupByRule.js');
const fs = require('fs');

let country;
let GPEs_inPage;
let defaultRegexSuccess = false;

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

            // let postcodeMatch = text.match(postcodeDefaultRegex);
            // if (postcodeMatch) {
            //     handlePostcodeMatch(postcodeMatch, matchingPostcodes, postcodeTextLocation, element, text);
            //     defaultRegexSuccess = true;
            //     // return;
            // }
            
            // Look for postcode using country regex
            let postcodeMatch = text.match(postcodeCountryRegex);
            if (postcodeMatch) {
                handlePostcodeMatch(postcodeMatch, matchingPostcodes, postcodeTextLocation, element, text);
                // return;
            }
        });
    }


    let uniquePostcodes = Array.from(matchingPostcodes);
    console.log(uniquePostcodes);

    for (let postcodeOfArr of uniquePostcodes) { // check each matching string
        console.log('verifing postcode', postcodeOfArr)
        let PostcodeObject = await VerifyPostcode(postcodeOfArr, countryFromURL, pageText);

        if(!countryFromURL){
            countryFromURL = PostcodeObject.postcodeAPIResponse.country;
        }

        const countryCode = getCountryAbbreviation(countryFromURL);
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
            if(addressDetails.Zipcode && (addressDetails.Zipcode != postcode)){
                postcodeAPIResponse = await passPostcodeToAPI(addressDetails.Zipcode, countryFromURL);
                if(postcodeAPIResponse){
                    console.log('returning correct postcode:', addressDetails.Zipcode)
                    return {postcode: addressDetails.Zipcode, postcodeAPIResponse: postcodeAPIResponse, addressDetails};
                }
            }
            fs.appendFile('matchesFromPostcode.txt', `${postcodeTextLocation[postcode].elements[0]}\n${postcodeTextLocation[postcode].texts[0]}\n\n`, (err) => {
                if (err) throw err;
            });
            country = null;
            GPEs_inPage = null;
            defaultRegexSuccess = false;
            return {postcode: postcode, postcodeAPIResponse: PostcodeObject.postcodeAPIResponse, addressDetails};
        }
    }
}

function handlePostcodeMatch(postcodeMatch, matchingPostcodes, postcodeTextLocation, element, text) {
    let postcode; 
    if(country == 'United States'){
        postcode = postcodeMatch[1];
    } else {
        postcode = postcodeMatch[0];
    }

    matchingPostcodes.add(postcode);

    if (!postcodeTextLocation[postcode]) {
        postcodeTextLocation[postcode] = {elements: [], texts: []};
    }
    
    postcodeTextLocation[postcode].elements.push(element.name);
    postcodeTextLocation[postcode].texts.push(text);
}

async function VerifyPostcode(_postcodeToVerify, countryFromURL, pageText = null){
    let response = null;
    
    response = await passPostcodeToAPI(_postcodeToVerify, countryFromURL);
    console.log('postcode response:', response)
    if(response.country == null && defaultRegexSuccess){
        response = await passPostcodeToAPI(_postcodeToVerify, ['United States', 'Germany', 'France']);
        country = response.country;
    }

    let postcodeAPIResponse = response;
    if(postcodeAPIResponse == null){
        postcode = null;
        return null;
    } else if(postcodeDetailsInPage(pageText, postcodeAPIResponse)){
        console.log('postcode found:', _postcodeToVerify);
        if(isBannedPostcode(_postcodeToVerify)){
            postcode = null;
            return null;
        } else {
            return { postcode: _postcodeToVerify, postcodeAPIResponse};
        }
    }
}

async function postcodeDetailsInPage(pageText = null, postcodeAPIResponse) {

    if(!GPEs_inPage && pageText != null){
        GPEs_inPage = await fetchGPEandORG(pageText).GPE;
    }

    if(GPEs_inPage){
        let city = postcodeAPIResponse.city;
        let region = postcodeAPIResponse.state;

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
        // addressInPageTxt = removeNonAddressDetails(addressInPageTxt, postcode); // postcode is passed in to be avoided from being removed
        
        let tokenRules = getTokenRules(countryCode);
        console.log('country code:', countryCode, tokenRules)
        console.log('addressInPageTxt:', addressInPageTxt)
        let tokenCount = countTokens(addressInPageTxt);
        console.log('token count:', tokenCount)

        if(tokenCount > tokenRules.maxNumberOfTokens){
            addressInPageTxt = shortenText(postcode, addressInPageTxt, tokenRules);
            tokenRules.takeAmmountOfTokens += 2;
            addressInPageTxtBackup = shortenText(postcode, addressInPageTxt, tokenRules);
        }
        console.log('address text after shortening:', addressInPageTxt)
        // if(await isValidAddressText(addressInPageTxt) == false){
        //     return null;
        // }

        // Call fetchStreetDetails API and break the loop if it returns street_name and street_number
        let addressDetails = await fetchStreetDetails(addressInPageTxt, countryCode);
        let addressDetailsBackup = await fetchStreetDetails(addressInPageTxtBackup, countryCode);

        if (addressDetails.Street_Name || addressDetails.Street_Num) {
            if (!addressDetails.Street_Num && addressDetailsBackup.Street_Num) {
                return addressDetailsBackup;
            }
            return addressDetails;
        } else if(addressDetailsBackup.Street_Name || addressDetailsBackup.Street_Num){
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

function shortenText(postcode, text, tokenRules) {
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

        // Extract the last 10 words, including the postcode
        let resultWords = words.slice(startIndex);
        // Join the words back into a string
        console.log(startIndex)
        if (startIndex < tokenRules.minNumberOfTokens) { // Check if the left side satisfies minNumberOfTokens
            let substringAfterPostcode = text.substring(index + postcode.length);
            let wordsAfter = substringAfterPostcode.split(/\s+/);
            // Check if the right side satisfies minNumberOfTokens
            if (wordsAfter.length >= tokenRules.minNumberOfTokens && resultWords.length <= tokenRules.minNumberOfTokens) {
                // TODO: If gone right side, then most likely street num of zipcode length, so take results from Spacy API
                let endIndex = Math.min(wordsAfter.length, tokenRules.minNumberOfTokens + 1); // Add 1 to include the postcode itself
                let resultWordsAfter = wordsAfter.slice(0, endIndex);
                resultWords = resultWords.concat(resultWordsAfter);
            }
        }
    
        // console.log('resulted shortened text: ', resultWords.join(' '))
        return resultWords.join(' ');
    } else {
        // Postcode not found in text
        console.log('Postcode not found in text');
        return text;
    }
}

function isBannedPostcode(postcode){
    let bannedPostcodes = ['94025', '94043', '94066', '94103', '33609', '94304', '94107']; //Meta, Google n others
    if(bannedPostcodes.includes(postcode)){
        return true;
    } else {
        return false;
    }

}

module.exports = {loopForPostcodeIfCountry};