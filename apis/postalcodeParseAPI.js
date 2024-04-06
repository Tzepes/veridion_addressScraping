const {parseapiKey, zipcodeBaseKey} =  require('./apiKeys.js');
const axios = require('axios');

async function getDataFromParseAPI(postcode) {
    const apiUrl = `http://postalcode.parseapi.com/api/${parseapiKey}/${postcode}`;
    
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        return data;
    } catch (error) {
        if (error.code === 'ENOTFOUND') {
            console.error('Could not resolve API URL. Please check your internet connection and DNS settings.');
        } else {
            // console.error(error);
        }
        return null;
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

module.exports = {getDataFromParseAPI, getDataFromZipcodeBase};