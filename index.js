const parquet = require('@dsnp/parquetjs');
const axios = require('axios');
const cheerio = require('cheerio');

const fs = require('fs');
const brightpassword = fs.readFileSync('.brightdataPassword').toString().trim();
const brightusername = fs.readFileSync('.brightdataUsername').toString().trim();

const axiosBrightDataInstance = axios.create({
    proxy: {
        host: 'brd.superproxy.io',
        port: '9222',
        auth: {
            username: brightusername,
            password: brightpassword
        }
    }
});

(async () => {
    let reader = await parquet.ParquetReader.openFile('websites.snappy .parquet');
    let cursor = reader.getCursor();

    let record = null;
    while(record = await cursor.next()) {
        console.log("");
        console.log(record.domain) // returns the URL

        try {
            console.log('trying...');
            const response = await axiosBrightDataInstance.get('http://' + record.domain);
            
            if (response.status === 200) {
                // console.log(retrieveLocationData(response.data));
                console.log('Success');
            } else {
                console.log('Failed');
            }
        } catch (error) {
            console.error("error");
        }
    }
    console.log("");

    await reader.close();
})();

async function retrieveLocationData(htmlContent) {
    // Parse the HTML content to retrieve the location data
    // Return the location data

    const $ = cheerio.load(htmlContent);

    const country = $('footer .country').text();
    const region = $('footer .region').text();
    const city = $('footer .city').text();
    const postcode = $('footer .postcode').text();
    const road = $('footer .road').text();
    const roadNumbers = $('footer .road-number').text().split(',');

    return { country, region, city, postcode, road, roadNumbers };
}