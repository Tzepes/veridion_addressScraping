const parquet = require('@dsnp/parquetjs');
const axios = require('axios-https-proxy-fix');
const cheerio = require('cheerio');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const {countries, getCountryAbbreviation} = require('./countriesCodes.js');
const getFirstPageLinks = require('./Extractors/firstPageLinksExtractor.js');
const {findCountry, getCountryFromURL} = require('./Extractors/countryExtractor.js');
const {loopForPostcodeIfCountry} = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');
const getPostalCodeFormat = require('./postalcodeRegex.js');

// Declare links array:
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

(async () => {  // the main function that starts the search, loops trough all linkfs from .parquet and starts search for data
    let reader = await parquet.ParquetReader.openFile('websites.snappy .parquet');
    let cursor = reader.getCursor();

    let record = null;
    while(record = await cursor.next()) {
        let retreivedData = await accessDomain('https://' + record.domain);

        if(!retreivedData?.postcode){ //incase the postcode hasn't been found, get the linkfs of the landing page and search trough them as well (initiate only if postcode missing since street tends to be placed next to it)
            for(let link of firstPageLinks){
                await new Promise(resolve => setTimeout(resolve, 500)); // delay to prevent blocking by the server
                retreivedData = await accessDomain(link);
                if(retreivedData?.postcode){
                    firstPageLinks = [];
                    break;
                }
            }
        }
        firstPageLinks = [];
        writeCSV(retreivedData, record.domain); //write data into CSV file
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
            if (response.headers['content-type'] === 'application/pdf' || response.headers['content-type'] === 'audio/mpeg' || response.headers['content-type'] === 'video/mp4') {
                console.log('Irrelevant file detected. Skipping...');
                return;
            }
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
    // the returned JSONs are different for parseAPI and zipcodebase API
    // we first check if the JSON is of parseAPI, otherwise, we try zipcodebase JSON format
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
        
        if (!country) { //in case country hasn't been found off the URLm take it from the postcode if available
            country = postcodeObject.postcodeAPIResponse?.country?.name ?? postcodeObject.postcodeAPIResponse?.country;
        }
    }
    // if neither options worked for finding at least the country, search for it trough the text of the page
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

    return {country, region, city, postcode, road, roadNumber}; // Return extracted data
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