const axios = require('axios');
const cheerio = require('cheerio');
const {countries, countryAbbreviations, getCountryAbbreviation} = require('./countriesCodes.js');
const getPostalCodeFormat = require('./postalcodeRegex.js');
const { findCountry, getCountryFromURL } = require('./Extractors/countryExtractor.js');
const {findPostcode, loopForPostcodeIfCountry} = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');


async function retrieveLocationData(url) {
    console.log(url);
    try {
        const response = await axios.get(url, { timeout: 10000 });
        if (response.status === 200) {
            let country;
            let countryGotFromURL = false;
            let region;
            let city;
            let postcode;
            let roadNumber;
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

            let postcodeObject;

            postcodeObject = await loopForPostcodeIfCountry(text, getPostalCodeFormat(country), country, getCountryAbbreviation(country),null, $, axios);  
            if(postcodeObject){
                postcode = postcodeObject.postcode;
                postcodeAPIResponse = postcodeObject.postcodeAPIResponse;
                if (postcodeAPIResponse && postcodeAPIResponse?.city?.name) { // check for parseAPI response
                    city = postcodeAPIResponse?.city?.name;
                    region = postcodeAPIResponse?.state?.name;
                } else if(postcodeAPIResponse && postcodeAPIResponse?.city){  // check for zpicodeBase api response
                    city = postcodeAPIResponse?.city;
                    region = postcodeAPIResponse?.state;
                } 
                
                if (!country) {
                    country = postcodeObject.postcodeAPIResponse?.country?.name ?? postcodeObject.postcodeAPIResponse?.country;
                }
            }

            const road = findRoad(htmlContent, $);
                // sometimes road can be correct but postcode not
                    // pass road to geolocator API
                        // compare returned postcode with postcode from other APIs
                            // if different
                                // compare countries of two post codes
                            // else return postcode

            // postcodeData = await getPostcodeDataParseAPI(postcode);


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

// Manually pass the URL to test
/* URLS TO TEST:*/
const urlsToTest = [
    // 1
    'https://www.wyandottewinery.com/',
    // 2
    'https://www.fesa.de/',
    // 3
    'https://thegrindcoffeebar.com/',
    // 4
    'https://www.irrigationcontrol.co.uk/contact-us/',
    // 5
    'https://www.mackay.co.uk/contact-us.html',
    // 6
    'https://embcmonroe.org/',
    // 7
    'https://blackbookmarketresearch.com',
    // 8
    'https://www.hophooligans.ro/',
    // 9
    'https://cabwhp.org',
    // 10
    'https://glacier.chat',
    // 11
    'https://kuk24.de',
    // 12 - country taken as mexico even tho postoce is for Italy Scilia
    'https://bridge.legal',
    // 13 - asian postcode, country not asinged probably because no country in country list file
    'https://pchandy.net',
    // 14 - german postcode found but information hasn t been retrieved
    'http://portraitbox.com',
    // 15
    'https://www.shalom-israel-reisen.de/'
];

retrieveLocationData(urlsToTest[8]);
