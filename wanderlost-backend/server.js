const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;
const AI_RIG_URL = process.env.AI_RIG_URL;

// Main discovery endpoint
app.post('/api/discover', async (req, res) => {
    const { lat, lng, category } = req.body;

    // Map category to Google Places types (legacy API uses single type string)
    const typeMap = {
        'restaurant': 'restaurant',
        'cafe': 'cafe',
        'bakery': 'bakery',
        'bar': 'bar',
        'park': 'park',
        'museum': 'museum'
    };

    try {
        // Build legacy Nearby Search URL
        let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&key=${GOOGLE_KEY}`;
        
        if (category && typeMap[category]) {
            url += `&type=${typeMap[category]}`;
        } else {
            // Default: search for a variety of interesting places
            url += `&type=restaurant|cafe|bakery|bar|park|museum`;
        }

        // 1. Search for nearby places
        const searchResponse = await axios.get(url, { timeout: 8000 });

        if (searchResponse.data.status !== 'OK' && searchResponse.data.status !== 'ZERO_RESULTS') {
            console.error("Google Places API error:", searchResponse.data.status, searchResponse.data.error_message);
            return res.status(500).json({ 
                success: false, 
                message: `Google API error: ${searchResponse.data.status}. ${searchResponse.data.error_message || ''}` 
            });
        }

        const places = searchResponse.data.results || [];
        
        if (places.length === 0) {
            return res.json({ success: false, message: "No places found nearby. Try a different area or category." });
        }

        // Filter for > 4.0 stars
        let candidates = places.filter(p => (p.rating || 0) >= 4.0);
        if (candidates.length === 0) candidates = places;

        // Pick a random candidate
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        
        // Build response
        let reason = "High community rating and authentic local presence.";

        // Optional: get reviews via Place Details
        try {
            const detailsResponse = await axios.get(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${target.place_id}&fields=reviews,editorial_summary&key=${GOOGLE_KEY}`,
                { timeout: 5000 }
            );
            
            const details = detailsResponse.data?.result;
            if (details?.reviews?.length > 0) {
                // Use first review as a flavor text
                reason = details.reviews[0].text?.substring(0, 200) || reason;
            }
            if (details?.editorial_summary?.overview) {
                reason = details.editorial_summary.overview;
            }
        } catch (detailsErr) {
            console.log("Details fetch skipped:", detailsErr.message);
        }

        // Return the discovery
        res.json({
            success: true,
            data: {
                title: target.name || "Hidden Gem",
                desc: target.vicinity || "A secret spot favored by locals.",
                lat: target.geometry?.location?.lat,
                lng: target.geometry?.location?.lng,
                reason: reason,
                type: (target.types && target.types[0]) || category || "discovery",
                rating: target.rating || null
            }
        });

    } catch (error) {
        console.error("Discovery Error:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data));
        }
        res.status(500).json({ success: false, message: "Backend error during discovery." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Wanderløst Backend running on port ${PORT}`);
});
