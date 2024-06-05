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
        return null;
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
        return null;
    }
}

async function passPostcodeToAPI(postcode, country){
    let countryCode;
    let response;

    if(!country){
        country = ['United States', 'Germany', 'France']
    }

    if(Array.isArray(country)){
        for(let i = 0; i < country.length; i++){
            countryCode = getCountryAbbreviation(country[i]);
            console.log('countryCode:', countryCode);
            response = await apiFunctionsByCountry[countryCode](postcode);
            if(response){
                console.log(response)
                return response;
            }
        }
    } else {
        countryCode = getCountryAbbreviation(country);
        console.log('countryCode:', countryCode);
        
        return await apiFunctionsByCountry[countryCode](postcode);
    }
    //returns: {city: 'city', state(region): 'state', country: 'country'}
}

module.exports = {passPostcodeToAPI};