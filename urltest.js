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
            let parseAPIsuccesful = false;
            let zipcodebaseAPIsuccesful = false;
            
            // postcodeObject = await findPostcode(text, getPostalCodeFormat(country), country, $, axios);
  
            // if(!postcodeObject.postcode) {
            //     postcodeObject = await loopForPostcodeIfCountry(text, getPostalCodeFormat(country), country, getCountryAbbreviation(country),null, $, axios);  
            // }

            postcodeObject = await loopForPostcodeIfCountry(text, getPostalCodeFormat(country), country, getCountryAbbreviation(country),null, $, axios);  


            postcode = postcodeObject.postcode;
            if(postcodeObject.postcodeAPIResponse && postcodeObject.postcodeAPIResponse[0]?.city){  // satisfay different API response formats
                city = postcodeObject.postcodeAPIResponse[0]?.city;
                region = postcodeObject.postcodeAPIResponse[0]?.state;
            } else if (postcodeObject.postcodeAPIResponse && postcodeObject.postcodeAPIResponse?.city.name) {
                city = postcodeObject.postcodeAPIResponse?.city.name;
                region = postcodeObject.postcodeAPIResponse?.state.name;
            }
        
            if (!country) {
                country = postcodeObject.postcodeAPIResponse?.country?.name ?? postcodeObject.postcodeAPIResponse?.country;
            }


            // postcodeData = await getPostcodeDataParseAPI(postcode);

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

// Manually pass the URL to test
/* URLS TO TEST:
https://www.wyandottewinery.com/ 
https://www.fesa.de/
https://thegrindcoffeebar.com/
https://irrigationcontrol.co.uk 
https://www.mackay.co.uk/contact-us.html
https://embcmonroe.org/
https://blackbookmarketresearch.com
https://www.hophooligans.ro/
https://cabwhp.org
https://glacier.chat
*/

const testUrl = 'https://www.wyandottewinery.com/ ';
retrieveLocationData(testUrl);
