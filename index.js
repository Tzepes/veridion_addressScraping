const parquet = require('@dsnp/parquetjs');
const axios = require('axios-https-proxy-fix');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const {countries, getCountryAbbreviation} = require('./countriesCodes.js');
const getFirstPageLinks = require('./Extractors/firstPageLinksExtractor.js');
const {findCountry, getCountryFromURL} = require('./Extractors/countryExtractor.js');
const {loopForPostcodeIfCountry} = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');
const getPostalCodeFormat = require('./postalcodeRegex.js');

const { getLanguage } = require('./MLM/languageNLP.js');

const { elementTextCleanUp, textCleanUp, cleanUpFromGPEs, cleanUpStreet } = require('./dataCleanup.js');

const {fetchStreetDetails, fetchGPEandORG, setDomainForSpacy} = require('./apis/spacyLocalAPI.js');

const { getCountryByScore } = require('./Extractors/countryProbabilityScore.js');

const SBR_WS_ENDPOINT = 'wss://brd-customer-hl_39f6f47e-zone-scraping_browser1:20tfspbnsze2@brd.superproxy.io:9222';

// Declare links array:
let firstPageLinks = [];
let country;
let language;
let ORGs = [];
let GPEs = [];
let ORGs_GPEs_Sorted = [];

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
        let domain = record.domain;

        // if (!domain.endsWith('.uk')) { continue; }

        let retreivedData = {country: null, region: null, city: null, postcode: null, road: null, roadNumber: null};
        retreivedData = await accessDomain('https://' + domain, page);
        setDomainForSpacy(domain) // THIS DOESN T WORK FIX IT MAYBE
        let lastRetreivedActualData = {country: retreivedData?.country, region: retreivedData?.region, city: retreivedData?.city, postcode: retreivedData?.postcode, road: retreivedData?.road, roadNumber: retreivedData?.roadNumber};
        
        if(!retreivedData?.postcode || !retreivedData?.road){
            if(ORGs_GPEs_Sorted){
                retreivedData = await googleScrape(ORGs_GPEs_Sorted, page);
            } else if(ORGs){
                retreivedData = await googleScrape(ORGs, page);
            }
            lastRetreivedActualData = updateRetrievedData(retreivedData, lastRetreivedActualData); 
        }

        // for now check only if postcode has not been found, the NER needs updated training + better data cleaning and text selection from element
        if(!retreivedData?.postcode && !retreivedData?.road){ //incase the postcode hasn't been found, get the linkfs of the landing page and search trough them as well (initiate only if postcode missing since street tends to be placed next to it)
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
        country = null;
        language = null;
        ORGs = [];
        GPEs = [];
        ORGs_GPEs_Sorted = [];
        // console.log('postcode:', retreivedData?.postcode, 'road:', retreivedData?.road)
        await writeCSV(retreivedData, domain); //write data into CSV file
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

        let pageContent = await page.content();

        let contentType = await page.evaluate(() => document.contentType);

        let pageText = await page.evaluate(() => document.body.innerText); //inner text fails sometimes

        language = getLanguage(pageText);

        if (contentType === 'application/pdf' || contentType === 'audio/mpeg' || contentType === 'video/mp4') {
            console.log('Irrelevant file detected. Skipping...');
            return;
        }

        if(!googleScraping && GPEs.length === 0 && ORGs.length === 0){
            await getGPEandORG(pageText, domain);
        } 

        retreivedData = await retrieveLocationData(pageContent, pageText, domain, googleScraping);
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

async function googleScrape(queries, page){
    console.log('Beginning search on google for:', queries);
    //query will be an array, loop trough it
    for(let query of queries){
        let searchQuery = encodeURIComponent(query);
        let retreivedData = await accessDomain('https://www.google.com/search?q=' + searchQuery, page, true);
        if(retreivedData?.postcode && retreivedData?.road){
            return retreivedData;
        }
    }
}

async function retrieveLocationData(htmlContent, pageText, url, googleScraping = false) {
    let region;
    let city;
    let postcode;
    let postcodeAPIResponse;
    let roadObject;
    let road;
    let roadNumber;

    const $ = cheerio.load(htmlContent);
    let htmlText;
    let targetTag;
    if(!googleScraping){
        targetTag = 'body'
    } else {
        targetTag = '.gqkR3b.hP3ybd';
    }

    htmlText = $(targetTag).text(); // select google maps div with address

    if(firstPageLinks.length === 0){
        firstPageLinks = await getFirstPageLinks(url, $);
    }

    if(!country){
        country = getCountryFromURL(url);
        country = getCountryByScore(GPEs, country, language);
    }

    // Extract postcode
    let postcodeObject;
    // the returned JSONs are different for parseAPI and zipcodebase API
    // we first check if the JSON is of parseAPI, otherwise, we try zipcodebase JSON format
    postcodeObject = await loopForPostcodeIfCountry(pageText, getPostalCodeFormat(country), country, $, targetTag);  
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
        country = findCountry(htmlText, countries);
    }
    if (country) {
        country = country.charAt(0).toUpperCase() + country.slice(1); // Capitalize first letter
    }


    if(postcode && postcodeObject.addressDetails){
        let streetLabeled = postcodeObject.addressDetails;
        road = streetLabeled.Street_Name;
        roadNumber = streetLabeled.Street_Num;
    }
    console.log('road and number after postcode: ', road, roadNumber)

    if(!road){
        // Extract road
        roadObject = findRoad($, targetTag, language);
        road = roadObject.road;
        roadNumber = roadObject.roadNumber;
    }

    if(road){
        road = cleanUpStreet(road);
    }
    
    // Output extracted data
    console.log('Country:', country)
    console.log('Region:', region);
    console.log('City:', city);
    console.log('Postcode:', postcode);
    console.log('Road:', road);
    console.log('Road number:', roadNumber);
    // console.log('language:', getLanguage(text));

    return  {country: country, region: region, city: city, postcode: postcode, road: road, roadNumber: roadNumber}; // Return extracted data
}

async function getGPEandORG(pageText, domain){
    console.log(`Getting GPE and ORG entities of ${domain}...`)
    pageText = textCleanUp(pageText);
    
    let pageLanguage = getLanguage(pageText);
    
    let fetchResult = await fetchGPEandORG(pageText, domain);

    ORGs = fetchResult.ORG;
    GPEs = fetchResult.GPE;
    if(fetchResult.ORG_GPE_Sorted.length > 10){
        ORGs_GPEs_Sorted = fetchResult?.ORG_GPE_Sorted.slice(0, 10); // get only the first 10 elements of the array for they are the most relevant
    } else {
        ORGs_GPEs_Sorted = fetchResult?.ORG_GPE_Sorted;
    }
    console.log(fetchResult);
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