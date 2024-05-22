const parquet = require('@dsnp/parquetjs');
const axios = require('axios-https-proxy-fix');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const LoopTroughElements = require('./pageScrapper.js');

const {countries, getCountryAbbreviation} = require('./countriesCodes.js');
const getFirstPageLinks = require('./Extractors/firstPageLinksExtractor.js');
const {findCountry, getCountryFromURL} = require('./Extractors/countryExtractor.js');
const {loopForPostcodeIfCountry} = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');
const getPostalCodeFormat = require('./postalcodeRegex.js');

const { getLanguage } = require('./MLM/languageNLP.js');

const { elementTextCleanUp, textCleanUp, cleanUpFromGPEs } = require('./dataCleanup.js');

const {fetchStreetDetails, fetchGPEandORG, setDomainForSpacy} = require('./apis/spacyLocalAPI.js');

const SBR_WS_ENDPOINT = 'wss://brd-customer-hl_39f6f47e-zone-scraping_browser1:20tfspbnsze2@brd.superproxy.io:9222';

// Declare links array:
let firstPageLinks = [];
let ORGs;
let GPEs;

const csvWriterFullAddress = createCsvWriter({
    path: 'results/fullAddressResults.csv',
    header: [
        {id: 'domain', title: 'Domain'},
        {id: 'country', title: 'Country'},
        {id: 'region', title: 'Region'},
        {id: 'city', title: 'City'},
        {id: 'postcode', title: 'Postcode'},
        {id: 'road', title: 'Road'},
        {id: 'roadNumber', title: 'Road Number'}
    ],
});

const csvWriterPostcode = createCsvWriter({
    path: 'results/postcodeResults.csv',
    header: [
        {id: 'domain', title: 'Domain'},
        {id: 'country', title: 'Country'},
        {id: 'region', title: 'Region'},
        {id: 'city', title: 'City'},
        {id: 'postcode', title: 'Postcode'},
        {id: 'road', title: 'Road'},
        {id: 'roadNumber', title: 'Road Number'}
    ],
});
const csvWriterStreet = createCsvWriter({
    path: 'results/streetResults.csv',
    header: [
        {id: 'domain', title: 'Domain'},
        {id: 'country', title: 'Country'},
        {id: 'region', title: 'Region'},
        {id: 'city', title: 'City'},
        {id: 'postcode', title: 'Postcode'},
        {id: 'road', title: 'Road'},
        {id: 'roadNumber', title: 'Road Number'}
    ],
});
const csvWriterNoAddress = createCsvWriter({
    path: 'results/noAddressResults.csv',
    header: [
        {id: 'domain', title: 'Domain'},
        {id: 'country', title: 'Country'},
        {id: 'region', title: 'Region'},
        {id: 'city', title: 'City'},
        {id: 'postcode', title: 'Postcode'},
        {id: 'road', title: 'Road'},
        {id: 'roadNumber', title: 'Road Number'}
    ],
});

(async () => {  // the main function that starts the search, loops trough all linkfs from .parquet and starts search for data
    let reader = await parquet.ParquetReader.openFile('websites.snappy .parquet');
    let cursor = reader.getCursor();
    let beginAt = 0; // skip the first 100 records
    let stopAT = 500; // stop at 100 records
    let index = 0;

    let record = null;
    console.log('Connecting to Scraping Browser...');
    let browser = await puppeteer.launch();
    let page = await browser.newPage();
    while(record = await cursor.next()) {
        if(index < beginAt){
            index++;
            continue;
        }
        // if(index >= stopAT){
        //     break;
        // }
        let retreivedData = {country: null, region: null, city: null, postcode: null, road: null, roadNumber: null};
        retreivedData = await accessDomain('https://' + record.domain, page);
        setDomainForSpacy(record.domain)
        let lastRetreivedActualData = {country: retreivedData?.country, region: retreivedData?.region, city: retreivedData?.city, postcode: retreivedData?.postcode, road: retreivedData?.road, roadNumber: retreivedData?.roadNumber};
        
        // for now check only if postcode has not been found, the NER needs updated training + better data cleaning and text selection from element
        if(!retreivedData?.postcode || !retreivedData?.road){ //incase the postcode hasn't been found, get the linkfs of the landing page and search trough them as well (initiate only if postcode missing since street tends to be placed next to it)
            for(let link of firstPageLinks){
                await new Promise(resolve => setTimeout(resolve, 500)); // delay to prevent blocking by athe server
                retreivedData = await accessDomain(link, page);
                lastRetreivedActualData = updateRetrievedData(retreivedData, lastRetreivedActualData); 
                if(retreivedData?.postcode && retreivedData?.road){
                    break;
                }
            }
            retreivedData = updateMissingData(retreivedData, lastRetreivedActualData);
        }
        firstPageLinks = [];

        //In case no postcode and no road has been found after search trough links, find GPE and ORG tags, and search google with them
        // if(!retreivedData?.postcode && !retreivedData?.road){
            
            //add second check: if(ORGs_GPEs_Sorted) || if(ORGs) // then google scrape for sorted or ORGs

        //     let orgIndex = 0;
        //     console.log('Beginning search on google');
        //     console.log(ORGs);
        //     console.log(GPEs);
        //     for(let ORG of ORGs){
        //         let searchQuery = encodeURIComponent(ORG + ' ' + GPEs[orgIndex]);
        //         retreivedData = await accessDomain('https://www.google.com/search?q=' + searchQuery, page, true);
        //         lastRetreivedActualData = updateRetrievedData(retreivedData, lastRetreivedActualData); 
        //         console.log('postcode:', retreivedData?.postcode, 'road:', retreivedData?.road)
        //         if(retreivedData.postcode && retreivedData.road){
        //             break;
        //         }
        //         orgIndex++;
        //     }
        // }
        
        ORGs.length = 0;
        GPEs.length = 0;
        // console.log('postcode:', retreivedData?.postcode, 'road:', retreivedData?.road)
        await writeCSV(retreivedData, record.domain); //write data into CSV file
    }
    console.log("");

    await page.close();
    await browser.close();
    await reader.close();
})();

function updateRetrievedData(retreivedData, lastRetreivedActualData) {
    if(retreivedData?.postcode){
        lastRetreivedActualData.city = retreivedData.city;
        lastRetreivedActualData.postcode = retreivedData.postcode;
        lastRetreivedActualData.region = retreivedData.region;
    }
    if(retreivedData?.road){
        lastRetreivedActualData.road = retreivedData.road;
        lastRetreivedActualData.roadNumber = retreivedData.roadNumber;
    }
    return lastRetreivedActualData;
}

function updateMissingData(retreivedData, lastRetreivedActualData) {
    if(!retreivedData?.postcode && lastRetreivedActualData?.postcode){
        retreivedData = retreivedData || {};
        retreivedData.city = lastRetreivedActualData.city;
        retreivedData.postcode = lastRetreivedActualData.postcode;
        retreivedData.region = lastRetreivedActualData.region;
    }
    if(!retreivedData?.road && lastRetreivedActualData?.road){
        retreivedData = retreivedData || {};
        retreivedData.road = lastRetreivedActualData.road;
        retreivedData.roadNumber = lastRetreivedActualData.roadNumber;
    }
    return retreivedData;
}

async function accessDomain(domain, page, googleScraping = false){
    let response;
    let retreivedData = null;
    console.log('Accesing domain: ' + domain);
    try {
        response = await page.goto(domain, { waitUntil: 'networkidle2', timeout: 30000 });

        let pageBody = await page.content();

        let contentType = await page.evaluate(() => document.contentType);

        if (contentType === 'application/pdf' || contentType === 'audio/mpeg' || contentType === 'video/mp4') {
            console.log('Irrelevant file detected. Skipping...');
            return;
        }

        if(!googleScraping){
            await getGPEandORG(pageBody);
        }

        retreivedData = await retrieveLocationData(pageBody, domain);
    } catch (error) {
        console.log(`Error accessing domain: ${error.message}`);
        console.log(`Error trace: ${error.stack}`);
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

    LoopTroughElements($);

    if(firstPageLinks.length === 0){
        firstPageLinks = await getFirstPageLinks(url, $);
    }

    country = getCountryFromURL(url);

    // Extract postcode
    let postcodeObject;
    // the returned JSONs are different for parseAPI and zipcodebase API
    // we first check if the JSON is of parseAPI, otherwise, we try zipcodebase JSON format
    postcodeObject = await loopForPostcodeIfCountry(getPostalCodeFormat(country), country, $);  
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
    if (country) {
        country = country.charAt(0).toUpperCase() + country.slice(1); // Capitalize first letter
    }


    if(postcode && postcodeObject.streetDetails){
        let streetLabeled = postcodeObject.streetDetails;
        road = streetLabeled.Street_Name;
        roadNumber = streetLabeled.Street_Num;
    }
    console.log('road and number after postcode: ', road, roadNumber)

    if(!road){
        // Extract road
        roadObject = findRoad($);
        road = roadObject.road;
        roadNumber = roadObject.roadNumber;
    }
    
    // Output extracted data
    console.log('Country:', country)
    console.log('Region:', region);
    console.log('City:', city);
    console.log('Postcode:', postcode);
    console.log('Road:', road);
    console.log('Road number:', roadNumber);
    // console.log('language:', getLanguage(text));

    return {country, region, city, postcode, road, roadNumber}; // Return extracted data
}

async function getGPEandORG(htmlContent){
    const $ = cheerio.load(htmlContent);
    
    let text = elementTextCleanUp($('body'), $);
    text = textCleanUp(text);
    
    let pageLanguage = getLanguage(text);
    
    let fetchResult = await fetchGPEandORG(text);
    ORGs = fetchResult.ORG;
    GPEs = fetchResult.GPE;
}

async function writeCSV(data, domain) {
    let dataObject = [{
        domain: domain,
        country: data?.country || getCountryFromURL(domain),
        region: data?.region,
        city: data?.city,
        postcode: data?.postcode,
        road: data?.road,
        roadNumber: data?.roadNumber
    }];

    if (dataObject[0].postcode && dataObject[0].road) {
        csvWriterFullAddress.writeRecords(dataObject)
    } else if (dataObject[0].postcode && !dataObject[0].road) {
        csvWriterPostcode.writeRecords(dataObject)
    } else if (!dataObject[0].postcode && (dataObject[0].road || dataObject[0].roadNumber)) {
        csvWriterStreet.writeRecords(dataObject)
    } else {
        csvWriterNoAddress.writeRecords(dataObject)
    }
}