const {parseapiKey, zipcodeBaseKey} =  require('./apiKeys.js');

async function getDataFromParseAPI(postalCode, axios) {
    const apiUrl = `http://postalcode.parseapi.com/api/${parseapiKey}/${postalCode}`;
    
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        return data;
    } catch (error) {
        console.log('error from getDataFromParseAPI');
    }
}

async function getDataFromZipcodeBase(postalCode, axios) {
    const apiUrl = `https://app.zipcodebase.com/api/v1/search?apikey=${zipcodeBaseKey}&codes=${postalCode}`;

    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        return data;
    } catch (error) {
     console.log(error);   
    }
}

module.exports = {getDataFromParseAPI, getDataFromZipcodeBase};