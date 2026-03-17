/**
 * WANDERLØST V3 - BACKEND HEALTH CHECK
 * Console-based tester for the Discovery Endpoint.
 */

const axios = require('axios');
const http = require('http');

// Configuration
const TEST_PORT = 3000;
const TEST_URL = `http://localhost:${TEST_PORT}/api/discover`;

// Zurich coordinates for testing
const DEFAULT_LAT = 47.3769;
const DEFAULT_LNG = 8.5417;

console.log("\n==================================");
console.log("🛠️  WANDERLØST V3 HEALTH CHECK  🛠️");
console.log("==================================\n");

async function checkServerStatus() {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${TEST_PORT}`, (res) => {
            resolve(true); // Server responded, though probably a 404 since no GET / exists
        }).on('error', (e) => {
            if (e.code === 'ECONNREFUSED') resolve(false);
            else resolve(true); // Server is up but rejecting, still counts as running
        });
        req.end();
    });
}

async function runTest() {
    const isRunning = await checkServerStatus();
    if (!isRunning) {
        console.error("❌  FATAL: Intelligence Rig (Server) is offline.");
        console.log("    Please start it first: node server/index.js\n");
        return;
    }

    console.log("🔄  Initiating API call to Intelligence Rig...");
    
    try {
        const startTime = Date.now();
        const response = await axios.post(TEST_URL, {
            lat: DEFAULT_LAT,
            lng: DEFAULT_LNG
        });
        const duration = Date.now() - startTime;

        const result = response.data;

        if (result.success) {
            console.log("\n✅  SUCCESS: Local Gem Isolated!");
            console.log("----------------------------------");
            console.log(`⏱️  Response Time: ${duration}ms`);
            console.log(`📌  Title:         ${result.data.title}`);
            console.log(`📍  Coords:        ${result.data.lat}, ${result.data.lng}`);
            console.log(`ID: ${result.data.placeId}`);
            console.log(`🎭  AI Verdict:    ${result.data.desc}`);
            console.log("----------------------------------\n");
        } else {
            console.log("\n⚠️  WARNING: Rig reported success=false.");
            console.log(`    Message: ${result.message}\n`);
            console.log("    (This is normal if querying a tourist-heavy or low-rating area, or if coordinates are blank.)\n");
        }

    } catch (error) {
        console.error("\n❌  ERROR: Uplink to Intelligence Rig Failed.");
        if (error.response) {
            console.error(`    Status Code: ${error.response.status}`);
            console.error(`    Details:`, error.response.data);
        } else {
            console.error(`    Network Error: ${error.message}`);
        }
        console.log("\n");
    }
}

// Execute
runTest();
