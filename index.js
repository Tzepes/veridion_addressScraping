const parquet = require('@dsnp/parquetjs');
const axios = require('axios');
const cheerio = require('cheerio');

const fs = require('fs');
const brightusername = fs.readFileSync('.brightdataUsername').toString().trim();
const brightpassword = fs.readFileSync('.brightdataPassword').toString().trim();

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

    const countries = [
        'Albania', 'Andorra', 'Armenia', 'Austria', 'Azerbaijan', 'Belarus', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kazakhstan', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands', 'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine', 'United Kingdom', 'Vatican City', // European countries
        'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Canada', 'Costa Rica', 'Cuba', 'Dominica', 'Dominican Republic', 'El Salvador', 'Grenada', 'Guatemala', 'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Trinidad and Tobago', 'United States', // Americas countries
        'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Guyana', 'Paraguay', 'Peru', 'Suriname', 'Uruguay', 'Venezuela' // South American countries
    ];

    const countryAbbreviations = [
        'AL', 'AD', 'AM', 'AT', 'AZ', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'GE', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'KZ', 'XK', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'TR', 'UA', 'GB', 'VA', // European countries
        'AG', 'BS', 'BB', 'BZ', 'CA', 'CR', 'CU', 'DM', 'DO', 'SV', 'GD', 'GT', 'HT', 'HN', 'JM', 'MX', 'NI', 'PA', 'KN', 'LC', 'VC', 'TT', 'US', // North American countries
        'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE' // South American countries
    ];

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

    // Example regex patterns to extract relevant information
    const postcodeRegex = /\b[A-Z]{2}\s*\d{4,10}\b/g; // Matches postcodes 
    const roadRegex = /(Road|Street|Avenue|Boulevard|Drive|Lane|Way|Circle|Court|Place|Terrace)\s*([A-Z][a-zA-Z]*(\s+[A-Z][a-zA-Z]*)*)/i; // Matches road names preceded by 'Road:'

    // Extract postcode
    const postcodeMatch = text.match(postcodeRegex);
    const postcode = postcodeMatch ? postcodeMatch[0] : null;

    // Extract road
    const roadMatch = text.match(roadRegex);
    const road = roadMatch ? roadMatch[2] : null;

    // Output extracted data
    // console.log('Country:', country)
    console.log('Postcode:', postcode);
    // console.log('Road:', road);

    // return body;
}