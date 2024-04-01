async function getDataFromParseAPI(postalCode, axios) {
    const apiKey = 'f7fcba63dcd2e57b5af452e35b42b1e5';
    const apiUrl = `http://postalcode.parseapi.com/api/${apiKey}/${postalCode}`;
    
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        return data;
    } catch (error) {

    }
}

async function getDataFromZipcodeBase(postalCode, axios) {
    const apiKey = '7fa4d290-efa3-11ee-b35e-8f8973e1b80d';
    const apiUrl = `https://app.zipcodebase.com/api/v1/search?apikey=${apiKey}&codes=${postalCode}`;

    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        return data;
    } catch (error) {
        
    }
}

module.exports = {getDataFromParseAPI, getDataFromZipcodeBase};