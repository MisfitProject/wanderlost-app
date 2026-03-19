/**
 * WANDERLØST V3 - BACKEND DISCOVERY RIG
 * Re-implemented pure robust logic from previous build.
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- IN-MEMORY DATABASE (Prototype Syncer) ---
// Note: In production, migrate this to MongoDB or PostgreSQL
const usersDB = {}; // { email: { password, token, stateData } }

// Helper to generate a simple secure token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// 1. User Registration
app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (usersDB[email]) return res.status(400).json({ error: "User already exists" });
    
    const token = generateToken();
    usersDB[email] = { password, token, stateData: null };
    
    res.json({ token, message: "Registration successful" });
});

// 2. User Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = usersDB[email];
    
    if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Issue a new token on login for security
    user.token = generateToken();
    res.json({ token: user.token, stateData: user.stateData, message: "Login successful" });
});

// 2b. Password Recovery
app.post('/api/auth/recover', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    res.json({ success: true, message: "If an account exists, a recovery link has been sent." });
});

// 2c. Update Credentials
app.put('/api/auth/update', (req, res) => {
    const token = req.headers.authorization;
    const { email, newEmail, newPassword } = req.body;
    
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    
    const userKey = Object.keys(usersDB).find(key => usersDB[key].token === token);
    if (!userKey || userKey !== email) {
        return res.status(401).json({ error: "Invalid token or email mismatch" });
    }
    
    const user = usersDB[userKey];
    if (newPassword) user.password = newPassword;
    
    if (newEmail && newEmail !== email) {
        if (usersDB[newEmail]) return res.status(400).json({ error: "Email already in use" });
        usersDB[newEmail] = user;
        delete usersDB[userKey];
    }
    
    res.json({ success: true, message: "Account updated successfully" });
});

// 3. Sync State (Update history)
app.post('/api/sync', (req, res) => {
    const token = req.headers.authorization;
    const { stateData } = req.body;
    
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    
    // Find user by token
    const user = Object.values(usersDB).find(u => u.token === token);
    if (!user) return res.status(401).json({ error: "Invalid token" });
    
    user.stateData = stateData; // Save their map history
    res.json({ success: true, message: "State synchronized" });
});

// 4. Fetch State (On initial load)
app.get('/api/sync', (req, res) => {
    const token = req.headers.authorization;
    
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    
    const user = Object.values(usersDB).find(u => u.token === token);
    if (!user) return res.status(401).json({ error: "Invalid token" });
    
    res.json({ stateData: user.stateData });
});

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;
const AI_RIG_URL = process.env.AI_RIG_URL;
const AI_MODEL = process.env.AI_MODEL_NAME || 'llama3';

app.post('/api/discover', async (req, res) => {
    const { lat, lng, category } = req.body;

    if (!lat || !lng) {
        return res.status(400).json({ success: false, message: "Coordinates missing." });
    }

    try {
        console.log(`\n[📡 SCAN INITIATED] Coordinates: ${lat}, ${lng} | Category: ${category || 'all'}`);

        let searchTypes = ['restaurant', 'cafe', 'tourist_attraction', 'park', 'museum', 'book_store'];
        if (category && category !== 'all') {
            searchTypes = [category];
        }

        // 1. SEARCH: Google Places API v1 (2.5km radius, high rating)
        const searchResponse = await axios.post(
            'https://places.googleapis.com/v1/places:searchNearby',
            {
                locationRestriction: {
                    circle: { center: { latitude: lat, longitude: lng }, radius: 2500 }
                },
                includedTypes: searchTypes,
                maxResultCount: 20
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_KEY,
                    'X-Goog-FieldMask': 'places.displayName,places.id,places.rating,places.location,places.editorialSummary'
                }
            }
        );

        const places = searchResponse.data.places || [];
        const candidates = places.filter(p => p.rating >= 4.7);

        if (candidates.length === 0) {
            console.log(`[🚫 NO GEMS] Insufficient rating threshold nearby.`);
            return res.json({ success: false, message: "No local secrets matching our criteria were found in this area." });
        }

        // 2. SELECTION
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const strippedId = target.id.replace('places/', '');
        console.log(`[🎯 TARGET ACQUIRED] ${target.displayName.text}`);

        // 3. RAPID RESPONSE
        console.log(`[✅ SUCCESS] Delivery: ${target.displayName.text}`);
        res.json({
            success: true,
            data: {
                id: strippedId,
                title: target.displayName.text,
                desc: target.editorialSummary?.text || "A highly-rated local gem discovered off the beaten path.",
                lat: target.location.latitude,
                lng: target.location.longitude,
                placeId: strippedId
            }
        });

    } catch (error) {
        console.error(`[🔥 FATAL] Search Engine Failure:`, error.message);
        res.status(500).json({ success: false, message: "Discovery Engine internal error." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n====================================================`);
    console.log(`🚀 WANDERLØST INTELLIGENCE RIG ACTIVE ON PORT ${PORT}`);
    console.log(`====================================================\n`);
});
