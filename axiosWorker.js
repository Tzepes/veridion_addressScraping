const { parentPort, workerData } = require('worker_threads');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const { writeCSV } = require('./utils/writeCsv.js');

const {countries, getCountryAbbreviation} = require('./utils/countriesCodes.js');
const {getFirstPageLinks, getDomainName} = require('./Extractors/firstPageLinksExtractor.js');
const {findCountry, getCountryFromURL} = require('./Extractors/countryExtractor.js');
const {loopForPostcodeIfCountry} = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');
const getPostalCodeFormat = require('./utils/postalcodeRegex.js');

const { elementTextCleanUp, textCleanUp, cleanUpFromGPEs, cleanUpStreet } = require('./utils/dataCleanup.js');

const {fetchStreetDetails, fetchGPEandORG, setDomainForSpacy} = require('./apis/spacyLocalAPI.js');

const { getCountryByScore, resetCountryScores } = require('./Extractors/countryProbabilityScore.js');

const SBR_WS_ENDPOINT = 'wss://brd-customer-hl_39f6f47e-zone-scraping_browser1:20tfspbnsze2@brd.superproxy.io:9222';

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.4472.124',
    // Add more user agents if needed
];

// Declare links array:
let firstPageLinks = [];
let country;
let countryScore = 0;
let secondaryCountry;
let language;
let currentDomain;
let ORGs = [];
let GPEs = [];
let ORGs_GPEs_Sorted = [];

(async () => {
    const domains = workerData.domains;
    // const domains = ['helmag.com'];

    for (let domain of domains) {
        currentDomain = domain;
        let logMessage = `scraping nr: ${domains.indexOf(domain) + 1} out of: ${domains.length} domain: ${domain}\n`;

        fs.appendFile('log.txt', logMessage, (err) => {
            if (err) throw err;
        });

        let retrievedData = {country: null, region: null, city: null, postcode: null, road: null, roadNumber: null};

        try {
            retrievedData = await accessDomain('https://' + domain);
            setDomainForSpacy(domain);
            let lastRetrievedActualData = {
                country: retrievedData?.country, 
                region: retrievedData?.region, 
                city: retrievedData?.city, 
                postcode: retrievedData?.postcode, 
                road: retrievedData?.road, 
                roadNumber: retrievedData?.roadNumber
            };

            if (!retrievedData?.postcode && !retrievedData?.road) {
                for (let link of firstPageLinks) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    retrievedData = await accessDomain(link);
                    lastRetrievedActualData = updateRetrievedData(retrievedData, lastRetrievedActualData);
                    if (retrievedData?.postcode && retrievedData?.road) {
                        break;
                    }
                }
                retrievedData = updateMissingData(retrievedData, lastRetrievedActualData);
            }

            if (!retrievedData?.postcode && !retrievedData?.road) {
                if (ORGs_GPEs_Sorted) {
                    retrievedData = await googleScrape(ORGs_GPEs_Sorted);
                } else if (ORGs) {
                    retrievedData = await googleScrape(ORGs);
                }
                lastRetrievedActualData = updateRetrievedData(retrievedData, lastRetrievedActualData);
            }

            if (!retrievedData?.postcode) {
                let domainNameQuery = getDomainName(domain);
                retrievedData = await googleScrape(domainNameQuery);
            }

        } catch (error) {
            console.error(`An error occurred while scraping ${domain}:`, error);
            continue;
        }

        if (!retrievedData?.postcode && !retrievedData?.road) {
            retrievedData = await googleScrape(ORGs_GPEs_Sorted);
        }

        resetGlobalValues();
        await writeCSV(retrievedData, domain);
    }
})();

function updateRetrievedData(retrievedData, lastRetrievedActualData) {
    if (retrievedData?.postcode) {
        lastRetrievedActualData.city = retrievedData.city;
        lastRetrievedActualData.postcode = retrievedData.postcode;
        lastRetrievedActualData.region = retrievedData.region;
    }
    if (retrievedData?.road) {
        lastRetrievedActualData.road = retrievedData.road;
        lastRetrievedActualData.roadNumber = retrievedData.roadNumber;
    }
    return lastRetrievedActualData;
}

function updateMissingData(retrievedData, lastRetrievedActualData) {
    if (!retrievedData?.postcode && lastRetrievedActualData?.postcode) {
        retrievedData = retrievedData || {};
        retrievedData.city = lastRetrievedActualData.city;
        retrievedData.postcode = lastRetrievedActualData.postcode;
        retrievedData.region = lastRetrievedActualData.region;
    }
    if (!retrievedData?.road && lastRetrievedActualData?.road) {
        retrievedData = retrievedData || {};
        retrievedData.road = lastRetrievedActualData.road;
        retrievedData.roadNumber = lastRetrievedActualData.roadNumber;
    }
    return retrievedData;
}

async function accessDomain(domain) {
    let response;
    let retrievedData = null;
    console.log('Accessing domain: ' + domain);
    try {
        response = await axios.get(domain, { timeout: 30000 });
        let pageContent = response.data;
        let contentType = response.headers['content-type'];

        if (contentType.includes('application/pdf') || contentType.includes('audio/mpeg') || contentType.includes('video/mp4')) {
            console.log('Irrelevant file detected. Skipping...');
            return;
        }

        let $ = cheerio.load(pageContent);
        let pageText = $('body').text();

        if (!GPEs.length && !ORGs.length) {
            await getGPEandORG(pageText, domain);
        }

        retrievedData = await retrieveLocationData(pageContent, pageText, domain);
    } catch (error) {
        console.log(`Error accessing domain: ${error.message}`);
    }
    return retrievedData;
}

async function googleScrape(queries) {
    console.log('Beginning search on google for:', queries);
    if (Array.isArray(queries)) {
        for (let query of queries) {
            let searchQuery = encodeURIComponent(query);
            let retrievedData = await accessDomain('https://www.google.com/search?q=' + searchQuery);
            if (retrievedData?.postcode && retrievedData?.road) {
                return retrievedData;
            }
        }
    } else {
        let searchQuery = encodeURIComponent(queries);
        let retrievedData = await accessDomain('https://www.google.com/search?q=' + searchQuery);
        if (retrievedData?.postcode && retrievedData?.road) {
            return retrievedData;
        }
    }
}

async function axiosFallback() {
    let retreivedData = null;
    console.log('Accessing domain with Axios: ' + currentDomain);
    try {
        const response = await axios.get(`http://www.${currentDomain}`, {
            httpsAgent: new (require('https').Agent)({  
                rejectUnauthorized: false
            })
        });
        const html = response.data;
        const $ = cheerio.load(html);
        const pageText = $('body').text();

        await getGPEandORG(pageText, currentDomain);

        retreivedData = await retrieveLocationData(html, pageText, currentDomain);
    } catch (error) {
        console.error(`Error accessing domain ${currentDomain} with Axios: ${error.message}`);
        throw error;
    }
    return retreivedData;
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
        //TQc1id IVvPP Jb0Zif yqK6Z k5T88b -> element for eniter container
    }

    htmlText = $(targetTag).text(); // select google maps div with address

    if(firstPageLinks.length === 0 && !googleScraping){
        firstPageLinks = await getFirstPageLinks(url, $);
    }

    // if porbability score <= 10, fetch GPEs again and getCountryByScore
    if (countryScore <= 15 && !googleScrape){
        await getGPEandORG(pageText, url)
        country = null;
    }

    if(!country || countryScore < 5){
        console.log('GETTING COUNTRY FROM URL')
        country = getCountryFromURL(url);
        let countryScoreObject = getCountryByScore(GPEs, country, language);
        console.log('Country score object:', countryScoreObject)
        country = countryScoreObject.name;
        countryScore = countryScoreObject.score;
        if(countryScoreObject.countryHighProbabilityByURL){
            secondaryCountry = countryScoreObject.countryHighProbabilityByURL.name;
        }
    }

    console.log('Country:', country, countryScore)

    // Extract postcode
    let postcodeObject;
    // the returned JSONs are different for parseAPI and zipcodebase API
    // we first check if the JSON is of parseAPI, otherwise, we try zipcodebase JSON format
    postcodeObject = await loopForPostcodeIfCountry(pageText, getPostalCodeFormat(country), country, getPostalCodeFormat(secondaryCountry), secondaryCountry, $, targetTag);  
    if(postcodeObject){
        postcode = postcodeObject.postcode;
        postcodeAPIResponse = postcodeObject.postcodeAPIResponse;
        city = postcodeAPIResponse?.city;
        region = postcodeAPIResponse?.region;
        
        if (!country) { //in case country hasn't been found off the URLm take it from the postcode if available
            console.log('Getting country from postcode response')
            country = postcodeObject.postcodeAPIResponse?.country;
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
        
    let fetchResult = await fetchGPEandORG(pageText, domain);

    ORGs = fetchResult.ORG;
    GPEs = fetchResult.GPE;
    if(fetchResult.ORG_GPE_Sorted.length > 10){
        ORGs_GPEs_Sorted = fetchResult?.ORG_GPE_Sorted.slice(0, 10); // get only the first 10 elements of the array for they are the most relevant
    } else {
        ORGs_GPEs_Sorted = fetchResult?.ORG_GPE_Sorted;
    }
    language = fetchResult.language;
    console.log(fetchResult);
}

function resetGlobalValues(){
    firstPageLinks = [];
    country = null;
    countryScore = 0;
    currentDomain = null;
    language = null;
    ORGs = [];
    GPEs = [];
    ORGs_GPEs_Sorted = [];
    resetCountryScores();
}