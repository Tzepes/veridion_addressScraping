const parquet = require('@dsnp/parquetjs');
const axios = require('axios');

(async () => {
    let reader = await parquet.ParquetReader.openFile('websites.snappy .parquet');
    let cursor = reader.getCursor();

    let record = null;
    while(record = await cursor.next()) {
        console.log(record.domain) // returns the URL

        try {
            console.log('trying...');
            const response = await axios.get('http://' + record.domain);
            console.log(response.data);

            if (response.status === 200) {
                console.log('Success');
            } else {
                console.log('Failed');
            }
        } catch (error) {
            console.error(error);
        }
    }

    await reader.close();
})();

async function retrieveLocationData(htmlContent) {
    // Parse the HTML content to retrieve the location data
    // Return the location data
}