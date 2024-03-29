const parquet = require('@dsnp/parquetjs');
const axios = require('axios');
const cheerio = require('cheerio');

const fs = require('fs');
const brightusername = fs.readFileSync('./brightdata/.brightdataUsername').toString().trim();
const brightpassword = fs.readFileSync('./brightdata/.brightdataPassword').toString().trim();

const {countries, countryAbbreviations} = require('./countriesCodes.js');
const postalcodeRegex = require('./postalcodeRegex.js');

const findCountry = require('./Extractors/countryExtractor.js');
const findPostcode = require('./Extractors/postcodeExtractor.js');
const findRoad = require('./Extractors/roadExtractor.js');

const getDataFromPostalCode = require('./apis/postalcodeParseAPI.js');

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
                retrieveLocationData(response.data);
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

async function retrieveLocationData(htmlContent) {
    // Declare fields:
    let country;
    let region;
    let city;
    let postcode;
    let road;
    let roadNumber;

    const $ = cheerio.load(htmlContent);

    // Extract text from relevant elements
    const text = $('body').text();

    country = findCountry(text, countries);

    // Extract postcode
    postcode = findPostcode(text, countries[country]);

    // country, region and city dont get assigned, maybe because async ?
    if (postcode) {
        const data = await getDataFromPostalCode(postcode, axios);
        country = data?.country?.name;
        if(country === 'United States') {
            region = data?.state?.name;
        }
        city = data?.city?.name;
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