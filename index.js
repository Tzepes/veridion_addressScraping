const parquet = require('@dsnp/parquetjs');
const axios = require('axios');
const cheerio = require('cheerio');

const fs = require('fs');
const brightusername = fs.readFileSync('.brightdataUsername').toString().trim();
const brightpassword = fs.readFileSync('.brightdataPassword').toString().trim();

const axiosBrightDataInstance = axios.create({
    proxy: {
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
            
            // // Test proxy connection
            // const proxyResponse = await axiosBrightDataInstance.get('https://api.ipify.org?format=json');
            
            // // Return response of domain trough proxy
            // const proxyResponse = await axiosBrightDataInstance.get('http://' + record.domain);
            
            // console.log('Proxy IP:', proxyResponse.data.ip);

            const response = await axios.get('http://' + record.domain, {
                timeout: 1000
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

    // Example regex patterns to extract relevant information
    const postcodeRegex = /\b\d{4}\b/g; // Matches 4-digit postcodes
    const roadRegex = /Road:\s*(\w+)/i; // Matches road names preceded by 'Road:'

    // Extract postcode
    const postcodeMatch = text.match(postcodeRegex);
    const postcode = postcodeMatch ? postcodeMatch[0] : null;

    // Extract road
    const roadMatch = text.match(roadRegex);
    const road = roadMatch ? roadMatch[1] : null;

    // Output extracted data
    console.log('Postcode:', postcode);
    console.log('Road:', road);

    // return body;
}