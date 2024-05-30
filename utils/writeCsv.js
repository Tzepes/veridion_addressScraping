const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const {getCountryFromURL} = require('../Extractors/countryExtractor.js');

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
    append: true
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
    append: true
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
    append: true
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
    append: true
});

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

module.exports = {writeCSV};