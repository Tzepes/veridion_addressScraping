const { parentPort, workerData } = require('worker_threads');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

const { writeCSV } = require('./utils/writeCsv.js');

const {countries, getCountryAbbreviation} = require('./utils/countriesCodes.js');
const getFirstPageLinks = require('./Extractors/firstPageLinksExtractor.js');
const {findCountry, getCountryFromURL} = require('./Extractors/countryExtractor.js');
const {loopForPostcodeIfCountry} = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');
const getPostalCodeFormat = require('./utils/postalcodeRegex.js');

const { elementTextCleanUp, textCleanUp, cleanUpFromGPEs, cleanUpStreet } = require('./utils/dataCleanup.js');

const {fetchStreetDetails, fetchGPEandORG, setDomainForSpacy} = require('./apis/spacyLocalAPI.js');

const { getCountryByScore } = require('./Extractors/countryProbabilityScore.js');

const SBR_WS_ENDPOINT = 'wss://brd-customer-hl_39f6f47e-zone-scraping_browser1:20tfspbnsze2@brd.superproxy.io:9222';

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.4472.124',
    // Add more user agents if needed
];

// Declare links array:
let firstPageLinks = [];
let country;
let countryScore;
let language;
let currentDomain;
let ORGs = [];
let GPEs = [];
let ORGs_GPEs_Sorted = [];

(async () => {  // the main function that starts the search, loops trough all linkfs from .parquet and starts search for data
    const domains = workerData.domains;
    // const domains = ['dbfcc.com'];

    console.log('Connecting to Scraping Browser...');
    let browser = await puppeteer.launch({ 
        headless: false, 
        ignoreHTTPSErrors: true,
        args: [
            "--proxy-bypass-list=*",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-setuid-sandbox",
            "--no-first-run",
            "--no-sandbox",
            "--no-zygote",
            "--single-process",
            "--ignore-certificate-errors",
            "--ignore-certificate-errors-spki-list",
            "--enable-features=NetworkService",
        ],
    });
    let page = await browser.newPage();
    await page.setUserAgent(userAgents[0]);
    await page.setViewport({ width: 1280, height: 800 });

    for(let domain of domains) {
        currentDomain = domain;
        let retreivedData = {country: null, region: null, city: null, postcode: null, road: null, roadNumber: null};
        try {
            retreivedData = await accessDomain('https://' + domain, page);
            setDomainForSpacy(domain) // THIS DOESN T WORK FIX IT MAYBE
            let lastRetreivedActualData = {country: retreivedData?.country, region: retreivedData?.region, city: retreivedData?.city, postcode: retreivedData?.postcode, road: retreivedData?.road, roadNumber: retreivedData?.roadNumber};
            
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
            
            if(!retreivedData?.postcode || !retreivedData?.road){
                if(ORGs_GPEs_Sorted){
                    retreivedData = await googleScrape(ORGs_GPEs_Sorted, page);
                } else if(ORGs){
                    retreivedData = await googleScrape(ORGs, page);
                }
                lastRetreivedActualData = updateRetrievedData(retreivedData, lastRetreivedActualData); 
            }
        } catch (error) {
            console.error(`An error occurred while scraping ${domain}:`, error);
            try {
                retreivedData = await axiosFallback();
            } catch (error) {
                console.error(`An error occurred while scraping ${domain} with Axios:`, error);
            }
            // Continue with the next domain
            continue;
        }

        if(!retreivedData?.postcode && !retreivedData?.road){
            retreivedData = await googleScrape(ORGs_GPEs_Sorted, page);
        }

        resetGlobalValues();
        // console.log('postcode:', retreivedData?.postcode, 'road:', retreivedData?.road)
        await writeCSV(retreivedData, domain); //write data into CSV file
    }
    console.log("");

    await page.close();
    await browser.close();
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

        // language = getLanguage(pageText);

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

        retreivedData = await axiosFallback();
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
    }

    htmlText = $(targetTag).text(); // select google maps div with address

    // if(firstPageLinks.length === 0){
    //     firstPageLinks = await getFirstPageLinks(url, $);
    // }

    //if porbability score <= 10, fetch GPEs again and getCountryByScore
    if (countryScore <= 10 && !googleScrape){
        await getGPEandORG(pageText, url)
        country = null;
    }
    
    if(!country){
        country = getCountryFromURL(url);
        let countryScoreObject = getCountryByScore(GPEs, country, language);
        country = countryScoreObject.name;
        countryScore = countryScoreObject.score;
    }

    console.log('Country:', country, countryScore)

    // Extract postcode
    let postcodeObject;
    // the returned JSONs are different for parseAPI and zipcodebase API
    // we first check if the JSON is of parseAPI, otherwise, we try zipcodebase JSON format
    postcodeObject = await loopForPostcodeIfCountry(pageText, getPostalCodeFormat(country), country, $, targetTag);  
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
}