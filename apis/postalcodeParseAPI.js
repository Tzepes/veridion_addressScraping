async function getDataFromPostalCode(postalCode, axios) {
    const apiKey = 'f7fcba63dcd2e57b5af452e35b42b1e5';
    const apiUrl = `http://postalcode.parseapi.com/api/${apiKey}/${postalCode}`;
    
    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        return data;
    } catch (error) {
        console.error(error);
    }
}

module.exports = getDataFromPostalCode;