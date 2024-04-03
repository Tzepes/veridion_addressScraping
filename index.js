const parquet = require('@dsnp/parquetjs');
const axios = require('axios');
const cheerio = require('cheerio');

const fs = require('fs');
const brightusername = fs.readFileSync('./brightdata/.brightdataUsername').toString().trim();
const brightpassword = fs.readFileSync('./brightdata/.brightdataPassword').toString().trim();
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const {countries, getCountryAbbreviation} = require('./countriesCodes.js');

const {findCountry, getCountryFromURL} = require('./Extractors/countryExtractor.js');
const {loopForPostcodeIfCountry} = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');
const getPostalCodeFormat = require('./postalcodeRegex.js');

// Declare routes:

const routes = ['/contact', '/about'];

const csvWriter = createCsvWriter({
    path: 'results/linkResultsTable.csv',
    header: [
        {id: 'domain', title: 'Domain'},
        {id: 'country', title: 'Country'},
        {id: 'region', title: 'Region'},
        {id: 'city', title: 'City'},
        {id: 'postcode', title: 'Postcode'},
        {id: 'road', title: 'Road'},
        {id: 'roadNumber', title: 'Road Number'}
    ]
});

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
    let retreivedData = null;
    while(record = await cursor.next()) {
        // console.log("");
        // console.log(record.domain) // returns the URL
        let retreivedData = await accessDomain('http://' + record.domain);
        writeCSV(retreivedData, record.domain);
    }
    console.log("");

    await reader.close();
})();

async function accessDomain(domain){
    let response;
    let retreivedData = null;

    try {
        response = await axios.get(domain, {
            timeout: 2000
        });
        console.log("");
        if (response.status === 200) {
            console.log(domain)
            retreivedData = retrieveLocationData(response.data, domain);
        } else {
            console.log('Failed');
        }
    } catch (error) {
        console.log('axios error connection');
    }

    return retreivedData;
}

async function retrieveLocationData(htmlContent, url) {
    let country;
    let region;
    let city;
    let postcode;
    let postcodeAPIResponse;
    let roadObject;
    let road;
    let roadNumber;

    const $ = cheerio.load(htmlContent);
    const text = $('body').text();

    country = getCountryFromURL(url);
    if (!country)
    {
        country = findCountry(text, countries);
    }

    // Extract postcode
    let postcodeObject;

    postcodeObject = await loopForPostcodeIfCountry(text, getPostalCodeFormat(country), country, getCountryAbbreviation(country),null, $, axios);  

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
    // if postcode not found but road name and number found, find postcode trough geolocator API
       
    // Extract road
    roadObject = findRoad(text, $);
    road = roadObject.road;
    roadNumber = roadObject.streetNumber;
    
    // Output extracted data
    console.log('Country:', country)
    console.log('Region:', region);
    console.log('City:', city);
    console.log('Postcode:', postcode);
    console.log('Road:', road);

    return {country, region, city, postcode, road, roadNumber};
}

function writeCSV(data, domain) {
    let dataObject = [{
        domain: domain,
        country: data?.country,
        region: data?.region,
        city: data?.city,
        postcode: data?.postcode,
        road: data?.road,
        roadNumber: data?.roadNumber
    }];

    csvWriter.writeRecords(dataObject);
}