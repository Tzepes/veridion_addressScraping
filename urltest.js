const axios = require('axios');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const {countries, countryAbbreviations, getCountryAbbreviation} = require('./utils/countriesCodes.js');
const getFirstPageLinks = require('./Extractors/firstPageLinksExtractor.js');
const getPostalCodeFormat = require('./utils/postalcodeRegex.js');
const { findCountry, getCountryFromURL, getCountryFromLanguage } = require('./Extractors/countryExtractor.js');
const {findPostcode, loopForPostcodeIfCountry} = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');
const {elementTextCleanUp, textCleanUp}= require('./utils/dataCleanup.js');
const {fetchStreetDetails, fetchGPEandORG} = require('./apis/spacyLocalAPI.js');
const {getLanguage} = require('./MLM/languageNLP.js');
const { getCountryByScore } = require('./Extractors/countryProbabilityScore.js');


const SBR_WS_ENDPOINT = 'wss://brd-customer-hl_39f6f47e-zone-scraping_browser1:20tfspbnsze2@brd.superproxy.io:9222';

async function retrieveLocationData(url) {
    console.log(url);
    try {
        const browser = await puppeteer.connect({
            browserWSEndpoint: SBR_WS_ENDPOINT,
            timeout: 20000
        });
        const page = await browser.newPage();
        console.log('loading page')
        await page.goto(url, {waitUntil: 'networkidle2', timeout: 30000});
        console.log('page loaded')
        
        const htmlContent = await page.content();
        console.log('page content loaded')
        // const response = await axios.get(url);
        // const htmlContent = response.data;
        // console.log(htmlContent)
        let country;
        let region;
        let city;
        let postcode;
        let road;
        let roadNumber;

        const $ = cheerio.load(htmlContent);
        let cleanedText = elementTextCleanUp('body', $);
        const text = textCleanUp(cleanedText);
        console.log('text cleaned')

        let GPEORG = await fetchGPEandORG(text, url);
        let GPEs = GPEORG.GPE;
        let ORGs = GPEORG.ORG;
        let pageLanguage = GPEORG.language;
        console.log("ORGs:", ORGs)
        console.log("GPEs:", GPEs)
        console.log('page language:', pageLanguage);
        
        let firstPageLinks = await getFirstPageLinks(url, $);
        console.log('got first page links')
        console.log(firstPageLinks)
        console.log('getting country');
        if(!country){
            country = getCountryFromURL(url);
            country = getCountryByScore(GPEs, country, pageLanguage);
        }
        console.log('country:', country)

        let postcodeObject;
        
        console.log('getting postcode');
        postcodeObject = await loopForPostcodeIfCountry(text, getPostalCodeFormat(country), country, $);  
        if(postcodeObject){
            postcode = postcodeObject.postcode;
            postcodeAPIResponse = postcodeObject.postcodeAPIResponse;
            if(postcodeAPIResponse && postcodeAPIResponse?.city){  // check for zpicodeBase api response
                city = postcodeAPIResponse?.city;
                region = postcodeAPIResponse?.region;
            } 
            
            if (!country) {
                country = postcodeObject.postcodeAPIResponse?.country?.name ?? postcodeObject.postcodeAPIResponse?.country;
            }
        }

        if(!postcode && !country){
            country = findCountry(text, countries);
        }

        
        if(postcode && postcodeObject.addressDetails){
            let streetLabeled = postcodeObject.addressDetails;
            road = streetLabeled.Street_Name;
            roadNumber = streetLabeled.Street_Num;
        }

        console.log('getting road');
        if(!road){
            let roadData = await findRoad($);
            road = roadData.road;
            roadNumber = roadData.roadNumber;
        }
            // sometimes road can be correct but postcode not
                // pass road to geolocator API
                    // compare returned postcode with postcode from other APIs
                        // if different
                            // compare countries of two post codes
                        // else return postcode

        // postcodeData = await getPostcodeDataParseAPI(postcode);

        // Output extracted data
        console.log('Country:', country);
        console.log('Region:', region);
        console.log('City:', city);
        console.log('Postcode:', postcode);
        console.log('Road:', road);
        console.log('Road Number:', roadNumber);
        await browser.close();
      
    } catch (error) {
        console.error(error);
    }
}

let searchQuery = encodeURIComponent('Heaven s Best Carpet Upholstery Cleaning' + ' ' + 'Chelsea');

// Manually pass the URL to test
/* URLS TO TEST:*/
const urlsToTest = [
    // 0
    'https://www.umbrawindowtinting.com/',
    // 1
    'https://www.wyandottewinery.com/',
    // 2
    'https://www.fesa.de/',
    // 3
    'https://thegrindcoffeebar.com/',
    // 4
    'https://www.irrigationcontrol.co.uk/contact-us/',
    // 5
    'https://www.mackay.co.uk/contact-us.html',
    // 6
    'https://embcmonroe.org/',
    // 7
    'https://blackbookmarketresearch.com',
    // 8
    'https://www.hophooligans.ro/',
    // 9
    'https://cabwhp.org',
    // 10
    'https://glacier.chat',
    // 11
    'https://kuk24.de',
    // 12 - country taken as mexico even tho postoce is for Italy Scilia
    'https://bridge.legal',
    // 13 - asian postcode, country not asinged probably because no country in country list file
    'https://pchandy.net',
    // 14 - german postcode found but information hasn t been retrieved
    'http://portraitbox.com',
    // 15
    'https://www.shalom-israel-reisen.de/',
    // 16
    'http://www.iqfitness.net/contact',
    // 17
    'http://ekiem.de',
    // 18
    'https://fastbolt.com',
    //19s
    'http://unitedairconditioning.com/contact',
    //20
    'http://seedsourceag.com',
    //21
    'http://societyfortheblind.org',
    //22
    'https://aiwoodwork.com',
    //23
    'https://azcrystal.com',
    //24
    'https://www.gpmoto.de/shop/wg/bekleidung/lederkombis/lederkombis-damen/lederkombis-1-teilig/',
    //25
    'https://www.lampenwelt.de',
    //26 -> possibly a javascript rendered page, so no html is returned, pupeteer might fix this issue
    'https://www.twinpondsnashua.com/',
    //27
    'https://greyhackle.com/contact/',
    //28 -> check what the html looks like when extracted, <br> dont get separated
    'https://www.athensgop.com/',
    //29
    'https://www.plentyconsulting.com/plenty-team',
    //30
    'https://servemenow.org/',
    //31 --> IP BAN, SEE IF BRIGHT DATA FIXES THIS
    'https://holmesandturner.com/',
    //32-- > IP BAN
    'https://www.hugedomains.com/contact.cfm',
    //33
    'https://www.google.com/search?q=' + searchQuery,
    //34 --> VERIFY YOU'RE HUMAN
    'https://younits.com/',
    //35 --> Check extraction of ORGS and GPES in index.js
    'https://www.heavensbestofbirmingham.com/',
    //36
    'https://happystagger.com/',
    //37
    'https://www.heavensbestofbirmingham.com/Contact-Us.html',
    //38
    'https://www.digipress.co.uk/contact/'
];

retrieveLocationData(urlsToTest[38]);
