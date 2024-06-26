const axios = require('axios');
let domain;
async function fetchStreetDetails(text, country) {
    console.log('Sending text to API:', text);
    console.log('Country:', country);
    
    if (!text) {
        return null;
    }

    const payload = {
        text: text,
        country: country
    };

    try {
        // Log the payload being sent to the API
        console.log('Payload:', JSON.stringify(payload, null, 2));
        
        // Send the request
        const response = await axios.post('http://127.0.0.1:8000/extract_street/', payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Log the response from the API
        console.log('Address parser response:', JSON.stringify(response.data, null, 2));
        
        return response.data;
    } catch (error) {
        console.error('Error fetching street details:', error);
        throw error; // Rethrow or handle error as needed
    }
}

async function fetchGPEandORG(text, _domain = null) {
    try {
        const response = await axios.post('http://127.0.0.1:8000/extract_gpe_org/', {
            text: text,
            domain: _domain
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching GPE and ORG:', error);
        throw error; // Rethrow or handle error as needed
    }
}

async function logDetails() {
    try {
        const streetDetails = await fetchStreetDetails('I live on 123 Main Street');
        console.log('Street Details:', streetDetails);

        const gpeAndOrgDetails = await fetchGPEandORG('Howe Drafting Services Home Services Resume Contact Us Company Profile Links top header pic Welcome to H.D.S. Howe Drafting Services are a NSW based company who specialise in providing an effective and professional drafting solution to a wide range of clients. We have become a leader in our industry by providing our clients with accurate and quality detailed drawings that meet their specific requirements. This site details our range of services with a comprehensive overview of our previous commercial and industrial projects. For further information or enquiries please contact us. Home - Services - Résumé - Contact - Company Profile - Links Industrial - Commercial - Bridges & Tunnels © Planet Homepage Web Design & Hosting');
        console.log('GPE and ORG Details:', gpeAndOrgDetails);
    } catch (error) {
        console.error('Error:', error);
    }
}

function setDomainForSpacy(_domain) {
    domain = _domain;
}

// logDetails()

module.exports = {fetchStreetDetails, fetchGPEandORG, setDomainForSpacy};