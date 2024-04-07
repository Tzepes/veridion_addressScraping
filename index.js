const parquet = require('@dsnp/parquetjs');
const axios = require('axios-https-proxy-fix');
const cheerio = require('cheerio');

const fs = require('fs');
const brightusername = fs.readFileSync('./brightdata/.brightdataUsername').toString().trim();
const brightpassword = fs.readFileSync('./brightdata/.brightdataPassword').toString().trim();
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const {countries, getCountryAbbreviation} = require('./countriesCodes.js');
const getFirstPageLinks = require('./Extractors/firstPageLinksExtractor.js');
const {findCountry, getCountryFromURL} = require('./Extractors/countryExtractor.js');
const {loopForPostcodeIfCountry} = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');
const getPostalCodeFormat = require('./postalcodeRegex.js');

// Declare routes:

let firstPageLinks = [];

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
        port: 22225,
        auth: {
            username: brightusername,
            password: brightpassword
        }
    },
    timeout: 5000 // 5 seconds timeout
});

(async () => {
    let reader = await parquet.ParquetReader.openFile('websites.snappy .parquet');
    let cursor = reader.getCursor();

    let record = null;
    while(record = await cursor.next()) {

        let retreivedData = await accessDomain('http://' + record.domain);

        if(!retreivedData?.postcode){
            for(let link of firstPageLinks){
                await new Promise(resolve => setTimeout(resolve, 500));
                retreivedData = await accessDomain(link);
                if(retreivedData?.postcode){
                    firstPageLinks = [];
                    break;
                }
            }
        }
        firstPageLinks = [];
        writeCSV(retreivedData, record.domain);
    }
    console.log("");

    await reader.close();
})();

async function accessDomain(domain){
    let response;
    let retreivedData = null;
    console.log('Accesing domain: ' + domain);
    try {
        response = await axios.get(domain, { timeout: 5000 });
        if (response.status === 200) {
            console.log(`Response status: ${response.status}`);
            console.log(`Response headers: ${response.headers}`);
            retreivedData = await retrieveLocationData(response.data, domain);
        } else {
            console.log(`Failed to access domain. Response status: ${response.status}`);
        }
    } catch (error) {
        console.log(`Error accessing domain: ${error.message}`);
        if (error.response) {
            console.log(`Error response data: ${error.response.data}`);
            console.log(`Error response status: ${error.response.status}`);
            console.log(`Error response headers: ${error.response.headers}`);
        } else if (error.request) {
            console.log(`Error request: ${error.request}`);
        }
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

    if(firstPageLinks.length === 0){
        firstPageLinks = await getFirstPageLinks(url, htmlContent, $);
    }

    country = getCountryFromURL(url);

    // Extract postcode
    let postcodeObject;

    postcodeObject = await loopForPostcodeIfCountry(text, getPostalCodeFormat(country), country, getCountryAbbreviation(country),null, $);  
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
        // if postcode not found but road name and number found, find postcode trough geolocator API

    if(!postcode && !country){
        country = findCountry(text, countries);
    }

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

    return {country, region, city, postcode, road, roadNumber}; // Postcode sometimes is taken as the one from the first link instead the correct one, maybe assing it as APIresponse.postcode
}

function writeCSV(data, domain) {
    let dataObject = [{
        domain: domain,
        country: data?.country || getCountryFromURL(domain),
        region: data?.region,
        city: data?.city,
        postcode: data?.postcode,
        road: data?.road,
        roadNumber: data?.roadNumber
    }];

    csvWriter.writeRecords(dataObject);
}