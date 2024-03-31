const axios = require('axios');
const cheerio = require('cheerio');
const {countries, countryAbbreviations} = require('./countriesCodes.js');
const getPostalCodeFormat = require('./postalcodeRegex.js');
const { findCountry, getCountryFromURL } = require('./Extractors/countryExtractor.js');
const {findPostcode, loopForPostcodeIfCountry} = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');
const getDataFromPostalCode = require('./apis/postalcodeParseAPI.js');

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
                // You need to implement findCountry function accordingly
                // country = findCountry(text);
            } else { 
                countryGotFromURL = true;
            }
            
            postcode = findPostcode(text, getPostalCodeFormat(country), country, $);
            let postcodeData = await getPostcodeData(postcode);
            
            if (countryGotFromURL && country !== postcodeData?.country?.name || !postcode) {
                postcode = await loopForPostcodeIfCountry(text, country, $);
            }

            postcodeData = await getPostcodeData(postcode);

            const road = findRoad(htmlContent);

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

async function getPostcodeData(postcode) {
    let data;
    if (postcode) {
        data = await getDataFromPostalCode(postcode, axios);
        
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

// Manually pass the URL to test
/* URLS TO TEST:
https://www.wyandottewinery.com/ 
https://www.fesa.de/
*/

const testUrl = 'https://www.fesa.de/';
retrieveLocationData(testUrl);
