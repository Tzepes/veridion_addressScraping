const parquet = require('@dsnp/parquetjs');
const axios = require('axios');
const cheerio = require('cheerio');

const fs = require('fs');
const brightusername = fs.readFileSync('./brightdata/.brightdataUsername').toString().trim();
const brightpassword = fs.readFileSync('./brightdata/.brightdataPassword').toString().trim();

const {countries, countryAbbreviations} = require('./countriesCodes.js');
const getPostalCodeFormat = require('./postalcodeRegex.js');

const {findCountry, getCountryFromURL} = require('./Extractors/countryExtractor.js');
const {findPostcode, loopForPostcodeIfCountry} = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');

const getDataFromPostalCode = require('./apis/postalcodeParseAPI.js');

// Declare fields:
let country;
let region;
let city;
let postcode;
let road;
let roadNumber;

const axiosBrightDataInstance = axios.create({
    proxy: {
        protocol: 'https',
        host: 'brd.superproxy.io',
        port: 9222,
        auth: {
            username: brightusername,
            password: brightpassword
        }
    },
    timeout: 10000 // 10 seconds timeout
});

(async () => {
    let reader = await parquet.ParquetReader.openFile('websites.snappy .parquet');
    let cursor = reader.getCursor();

    let record = null;
    while(record = await cursor.next()) {
        // console.log("");
        // console.log(record.domain) // returns the URL

        try {
            const response = await axios.get('http://' + record.domain, {
                timeout: 10000
            });
            console.log("");
            if (response.status === 200) {
                console.log(record.domain)
                retrieveLocationData(response.data, record.domain);
            } else {
                console.log('Failed');
            }
        } catch (error) {
            // console.error(error);
        }
    }
    console.log("");

    await reader.close();
})();

async function retrieveLocationData(htmlContent, url) {
    const $ = cheerio.load(htmlContent);

    // Extract text from relevant elements
    const text = $('body').text();

    let countryGotFromURL = false;
    country = getCountryFromURL(url);
    if (!country)
    {
        country = findCountry(text, countries);
    } else {
        countryGotFromURL = true;
    }

    // Extract postcode
    postcode = findPostcode(text, getPostalCodeFormat(country));

    let postcodeData = await getPostcodeData(postcode, countryGotFromURL)
    
    if (countryGotFromURL) {
        if(country !== postcodeData?.country?.name){
            postcode = await loopForPostcodeIfCountry(text, country, $);
        }
    }
       
    // Extract road
    road = findRoad(text);
    
    // Output extracted data
    console.log('Country:', country)
    console.log('Region:', region);
    console.log('City:', city);
    console.log('Postcode:', postcode);
    console.log('Road:', road);
    console.log('Road number:', roadNumber);
}

async function getPostcodeData(postcode, countryGotFromURL) {
    let data;
    if (postcode) {
        data = await getDataFromPostalCode(postcode, axios);
        
        if(!countryGotFromURL){
            country = data?.country?.name;
        }
        
        if(!country){
            country = data?.country?.name;
        } 
        
        region = data?.state?.name;   
        city = data?.city?.name;
    }
    return data;
}