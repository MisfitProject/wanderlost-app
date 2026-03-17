const axios = require('axios');

/**
 * Wanderløst Backend Validation Suite
 * 
 * This script verifies the health of the discovery Intelligence Rig.
 * It checks for:
 * 1. API Connectivity
 * 2. Proper data structure (including place_id for named navigation)
 * 3. Result randomization (to avoid repetitive suggestions)
 */

const TARGET_URL = process.env.TEST_BACKEND_URL || 'http://localhost:3000';

async function runTest(iteration = 1) {
    console.log(`\n🔍 [Test ${iteration}] Scanning at coordinates: 47.3769, 8.5417 (Zurich)`);
    
    try {
        const startTime = Date.now();
        const response = await axios.post(`${TARGET_URL}/api/discover`, {
            lat: 47.3769,
            lng: 8.5417
        });
        const duration = Date.now() - startTime;

        const result = response.data;

        if (!result.success) {
            console.error(`❌ Discovery Failed: ${result.message}`);
            return null;
        }

        const data = result.data;
        console.log(`✅ DISCOVERY SUCCESS (${duration}ms)`);
        console.log(`📍 Place Found: ${data.title}`);
        
        // Validation Checks
        let warnings = [];
        if (!data.id) warnings.push("MISSING place_id (Named navigation will fail)");
        if (!data.lat || !data.lng) warnings.push("MISSING coordinates");
        
        if (warnings.length > 0) {
            warnings.forEach(w => console.warn(`⚠️  WARNING: ${w}`));
        } else {
            console.log("💎 Data Integrity: 100% (Place ID & Coordinates Verified)");
        }

        return data.id || data.title;

    } catch (error) {
        console.error(`💥 CRITICAL ERROR: Unable to reach backend at ${TARGET_URL}`);
        console.error(`   Reason: ${error.message}`);
        return null;
    }
}

async function startSuite() {
    console.log("====================================================");
    console.log("🚀 WANDERLØST INTELLIGENCE RIG: HEALTH CHECK START");
    console.log("====================================================");

    const result1 = await runTest(1);
    const result2 = await runTest(2);

    console.log("\n--- Final Analysis ---");
    if (result1 && result2) {
        if (result1 === result2) {
            console.warn("⚠️  RANDOMIZATION WARNING: Backend returned the same spot twice in a row.");
            console.warn("   (Note: This is normal if only one high-rated spot exists in the area).");
        } else {
            console.log("✨ RANDOMIZATION VERIFIED: Backend successfully varied localized signals.");
        }
        console.log("\n🏁 HEALTH CHECK COMPLETE: Backend is active and mission-ready.");
    } else {
        console.error("\n❌ HEALTH CHECK FAILED: Backend is unresponsive or unstable.");
    }
    console.log("====================================================\n");
}

startSuite();
