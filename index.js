const parquet = require('@dsnp/parquetjs');
const axios = require('axios');
const cheerio = require('cheerio');

const fs = require('fs');
const brightusername = fs.readFileSync('.brightdataUsername').toString().trim();
const brightpassword = fs.readFileSync('.brightdataPassword').toString().trim();

const {countries, countryAbbreviations} = require('./countriesCodes.js');
const postalcodeRegex = require('./postalcodeRegex.js')

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
        console.log("");
        console.log(record.domain) // returns the URL

        try {
            // console.log('Checking proxy...');
            
            // Test proxy connection
            // const proxyResponse = await axiosBrightDataInstance.get('https://api.ipify.org?format=json');

            // // Return response of domain trough proxy
            // const proxyResponse = await axiosBrightDataInstance.get('http://' + record.domain);
            
            // console.log('Proxy IP:', proxyResponse.data.ip);
            // console.log(axiosBrightDataInstance);

            const response = await axios.get('http://' + record.domain, {
                timeout: 10000
            });

            if (response.status === 200) {
                retrieveLocationData(response.data);
                console.log('Success');
            } else {
                console.log('Failed');
            }
        } catch (error) {
            console.error(error);
        }
    }
    console.log("");

    await reader.close();
})();

async function retrieveLocationData(htmlContent) {
    // Parse the HTML content to retrieve the location data
    // Return the location data

    const $ = cheerio.load(htmlContent);

    // Extract text from relevant elements
    const text = $('body').text();

    const countryRegex = new RegExp('\\b(' + countries.join('|') + ')\\b', 'i');
    const countryMatch = text.match(countryRegex);
    let country = countryMatch ? countryMatch[0] : null;

    if (country === null) {
        const countryAbbreviationRegex = new RegExp('\\b(' + countryAbbreviations.join('|') + ')\\b');
        const countryAbbreviationMatch = text.match(countryAbbreviationRegex);
        if(countryAbbreviationMatch){
            const abbreviationIndex = countryAbbreviations.indexOf(countryAbbreviationMatch[0]);
            country = countries[abbreviationIndex];
        } else {
            country = null;
        }
    }

    // Extract postcode

    //Things to check for: 
    // some states are spelled fully, such as Ohio instead of OH
    // could return country based on postal code in most cases
    const postalcode = postalcodeRegex[country];

    const postcodeWithLabelRegex = /Postcode\s*([A-Z]{2}\s*\d{4,10})\b/;
    const postcodeRegexWithState = /\b[A-Z]{2}\s*\d{4,10}\b/g; 
    
    // let postcodeMatch = text.match(postcodeWithLabelRegex);
    let postcodeMatch = text.match(postalcode);
    let postcode = postcodeMatch ? postcodeMatch[1] : null;

    if(!postcode) {
        postcodeMatch = text.match(postcodeWithLabelRegex);
        if (postcodeMatch) {
            postcode = postcodeMatch[1];
        } else {
            postcodeMatch = text.match(postcodeRegexWithState);
            if (postcodeMatch) {
                postcode = postcodeMatch[0];
            }
        }
    }
    
    // Extract road
    const roadRegex = /(Road|Street|Avenue|Boulevard|Drive|Lane|Way|Circle|Court|Place|Terrace)\s*([A-Z][a-zA-Z]*(\s+[A-Z][a-zA-Z]*)*)/i; // Matches road names preceded by 'Road:'
    const roadMatch = text.match(roadRegex);
    const road = roadMatch ? roadMatch[2] : null;

    // Output extracted data
    console.log('Country:', country)
    console.log('Postcode:', postcode);
    console.log('Road:', road);

    // return body;
}