const axios = require('axios');
const cheerio = require('cheerio');
const {countries, countryAbbreviations} = require('./countriesCodes.js');
const getPostalCodeFormat = require('./postalcodeRegex.js');
const { findCountry, getCountryFromURL } = require('./Extractors/countryExtractor.js');
const {findPostcode, loopForPostcodeIfCountry} = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');
const {getDataFromParseAPI, getDataFromZipcodeBase} = require('./apis/postalcodeParseAPI.js');

let country;
let countryGotFromURL = false;
let postcode;
let region;
let city;
let road;
let roadNumber

async function retrieveLocationData(url) {
    console.log(url);
    try {
        const response = await axios.get(url, { timeout: 10000 });
        if (response.status === 200) {
            const htmlContent = response.data;
            const $ = cheerio.load(htmlContent);
            const text = $('body').text();

            country = getCountryFromURL(url);
            if (!country) {
                // Extract country from text if not found in URL
                // implement findCountry function accordingly
                // country = findCountry(text);
            } else { 
                countryGotFromURL = true;
            }
            
            postcode = findPostcode(text, getPostalCodeFormat(country), country, $);
            let postcodeData = await getDataFromParseAPI(postcode);
            
            if (countryGotFromURL && country !== postcodeData?.country?.name || !postcode) {
                postcode = await loopForPostcodeIfCountry(text, country, null, $, axios);
                // postcodeObject = loopForPostcodeIfCountry(text, country, postcodeData, $); + add axios as parametere 
                // postcode = postcodeObject.postcode;
                // postcodeData = postcodeObject.postcodeData;
            }

            postcodeData = await getPostcodeDataParseAPI(postcode);

            const road = findRoad(htmlContent, $);

            // Output extracted data
            console.log('Country:', country);
            console.log('Region:', region);
            console.log('City:', city);
            console.log('Postcode:', postcode);
            console.log('Road:', road);
        } else {
            console.log('Failed to fetch URL:', url);
        }
    } catch (error) {
        console.error(error);
    }
}

async function getPostcodeDataParseAPI(postcode) { // parsecodeAPI
    let data;
    if (postcode) {
        data = await getDataFromParseAPI(postcode, axios);
        
        if(!countryGotFromURL){
            country = data?.country?.name;
        }
        
        if(!country || country === 'Unknown'){
            country = data?.country?.name;
        } 
        
        region = data?.state?.name;   
        city = data?.city?.name;
    }
    return data;
}

async function getZipcodeBaseAPI(postcode) { // pass country code as parametere if needed
    let data;
    if (postcode) {
        data = await getDataFromZipcodeBase(postcode, axios); 

        if(data[postcode].length() > 1) {
            for (let i = 0; i < data[postcode].length(); i++) {
                if(data[postcode][i].country_code === country) { // Change country to countryCode from countriesCodes.js
                    region = data[postcode][i].state;
                    city = data[postcode][i].city;
                    return data;
                }
            }
        }

        if(!countryGotFromURL || !country || country === 'Unknown'){
            country = data[postcode][0].country_code;
        }

        region = data[postcode][0].state;
        city = data[postcode][0].city;
    }
    return data;
}

// Manually pass the URL to test
/* URLS TO TEST:
https://www.wyandottewinery.com/ 
https://www.fesa.de/
https://thegrindcoffeebar.com/
https://irrigationcontrol.co.uk 
https://www.mackay.co.uk/contact-us.html
*/

const testUrl = 'https://www.wyandottewinery.com/';
retrieveLocationData(testUrl);
