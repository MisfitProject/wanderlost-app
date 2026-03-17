const axios = require('axios');

async function testDiscovery() {
    console.log("--- Starting Discovery API Test ---");
    try {
        const response = await axios.post('http://localhost:3000/api/discover', {
            lat: 47.3769,
            lng: 8.5417
        });
        console.log("Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Test Failed:", error.message);
        if (error.response) {
            console.error("Data:", error.response.data);
        }
    }
}

testDiscovery();
