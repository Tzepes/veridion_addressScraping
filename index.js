const parquet = require('@dsnp/parquetjs');
const axios = require('axios');
const cheerio = require('cheerio');

const fs = require('fs');
const brightusername = fs.readFileSync('./brightdata/.brightdataUsername').toString().trim();
const brightpassword = fs.readFileSync('./brightdata/.brightdataPassword').toString().trim();

const {countries, countryAbbreviations, getCountryAbbreviation} = require('./countriesCodes.js');

const {findCountry, getCountryFromURL} = require('./Extractors/countryExtractor.js');
const {findPostcode, loopForPostcodeIfCountry} = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');
const getPostalCodeFormat = require('./postalcodeRegex.js');

// Declare fields:
let country;
let countryGotFromURL = false;
let region;
let city;
let postcode;
let road;
let roadNumber;
const routes = ['/contact', '/about', '/contact-us', '/about-us', '/contactus', '/aboutus', '/contact-us.html', '/about-us.html', '/contactus.html', '/aboutus.html', '/contact.html', '/about.html', '/locations'];

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

// TODO:
    // 1. if post code, city, and region or city have not been found, try access /contact, /about, /contact-us, /about-us, /contactus, /aboutus, /contact-us.html, /about-us.html, /contactus.html, /aboutus.html, /contact.html, /about.html, /locations

(async () => {
    let reader = await parquet.ParquetReader.openFile('websites.snappy .parquet');
    let cursor = reader.getCursor();

    let record = null;
    let retreivedData = null;
    while(record = await cursor.next()) {
        // console.log("");
        // console.log(record.domain) // returns the URL
        let response;
        try {
            response = await axios.get('http://' + record.domain, {
                timeout: 10000
            });
            console.log("");
            if (response.status === 200) {
                console.log(record.domain)
                retreivedData = retrieveLocationData(response.data, record.domain);
            } else {
                console.log('Failed');
            }
        } catch (error) {
            console.log('axios error connection');
        }

        // if not enough info (for example, no postcode)
            // try other routes
                // if postcode found 
                    // break
            //if no response from other routes
                // return at least country by url and road (remember the data durring route looping)

        if(response && !retreivedData.postcode){
            checkRoutes('http://' + record.domain, retreivedData)
        }
    }
    console.log("");

    await reader.close();
})();

async function checkRoutes(domain, retreivedData) {
    for (const route of routes) {
        try {
            const response = await axios.get('http://' + domain + route, {
                timeout: 10000
            });
            console.log("");
            if (response.status === 200) {
                console.log(domain + route)
                retreivedData = retrieveLocationData(response.data, domain + route);
            } else {
                console.log('Failed');
            }
        } catch (error) {
            //console.log('axios error connection');
        }

        if(retreivedData.postcode){
            break;
        }
    }
}

async function retrieveLocationData(htmlContent, url) {
    const $ = cheerio.load(htmlContent);
    const text = $('body').text();

    country = getCountryFromURL(url);
    if (!country)
    {
        country = findCountry(text, countries);
    } else {
        countryGotFromURL = true;
    }

    // Extract postcode
    let postcodeObject;
    let parseAPIsuccesful = false;
    let zipcodebaseAPIsuccesful = false;
    
    postcodeObject = await findPostcode(text, getPostalCodeFormat(country), country, $, axios);
    if(postcodeObject){
        parseAPIsuccesful = true;
    }
    
    if(!postcodeObject) {
        postcodeObject = await loopForPostcodeIfCountry(text, country, getCountryAbbreviation(country),null, $, axios);  
        if(postcodeObject){
            zipcodebaseAPIsuccesful = true;
        }
    }
    
    postcode = postcodeObject.postcode;
    if(zipcodebaseAPIsuccesful){  // satisfay different API response formats
        city = postcodeObject.postcodeAPIResponse[0]?.city;
        region = postcodeObject.postcodeAPIResponse[0]?.state;
    } else if (parseAPIsuccesful) {
        city = postcodeObject.postcodeAPIResponse?.city.name;
        region = postcodeObject.postcodeAPIResponse?.state.name;
    }

    if (!country && !countryGotFromURL) {
        country = postcodeObject.postcodeAPIResponse?.country?.name ?? postcodeObject.postcodeAPIResponse?.country;
    }
    // if postcode not found but road name and number found, find postcode trough geolocator API
       
    // Extract road
    road = findRoad(text, $);
    
    // Output extracted data
    console.log('Country:', country)
    console.log('Region:', region);
    console.log('City:', city);
    console.log('Postcode:', postcode);
    console.log('Road:', road);

    return {country, region, city, postcode, road, countryGotFromURL};
}