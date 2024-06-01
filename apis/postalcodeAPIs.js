const {parseapiKey, zipcodeBaseKey} =  require('./apiKeys.js');
const {getCountryAbbreviation} = require('../utils/countriesCodes.js')
const axios = require('axios');

const apiFunctionsByCountry = {
    'US': getDataFromParseAPI,
    'GB': getDataFromUKAPI,
    'UK': getDataFromUKAPI,
    'DE': getDataFromOpenPLZ
    // Add more country-function pairs as needed
};

async function getDataFromParseAPI(postcode) {
    const apiUrl = `http://postalcode.parseapi.com/api/${parseapiKey}/${postcode}`;
    
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        return {city: data.city.name, region: data.state.name, country: 'United States'};
    } catch (error) {
        if (error.code === 'ENOTFOUND') {
            console.error('Could not resolve API URL. Please check your internet connection and DNS settings.');
        } else {
            // console.error(error);
        }
        return null;
    }
}

async function getDataFromUKAPI(postcode) {
    const apiUrl = `https://api.postcodes.io/postcodes`;

    try {
        const response = await axios.post(apiUrl, {
            postcodes: [postcode]
        });
        const data = response.data;

        return {city: data.result[0].result.admin_district, region: data.result[0].result.country, country: 'United Kingdom'};
    } catch (error) {
        console.error(error);
    }

}

async function getDataFromOpenPLZ(postcode) {
    const apiUrl = `https://openplzapi.org/de/Localities?postalCode=${postcode}&page=1&pageSize=10`;

    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        return {city: data[0].name, region: data[0].federalState.name, country: 'Germany'};
    } catch (error) {
        console.error(error);
    }
}

async function getDataFromZipcodeBase(postcode) {
    const apiUrl = `https://app.zipcodebase.com/api/v1/search?apikey=${zipcodeBaseKey}&codes=${postcode}`;

    try {
        const response = await axios.get(apiUrl);
        const data = response.data;
        return data;
    } catch (error) {
     console.log(error);   
    }
}

async function passPostcodeToAPI(postcode, country){
    let countryCode = getCountryAbbreviation(country);
    console.log('countryCode:', countryCode);
    //returns: {city: 'city', state(region): 'state', country: 'country'}
    return apiFunctionsByCountry[countryCode](postcode);
}

module.exports = {passPostcodeToAPI};