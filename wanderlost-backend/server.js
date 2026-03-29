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

    // Map category to Google Places types
    const defaultTypes = ['restaurant', 'cafe', 'tourist_attraction', 'park', 'museum', 'bakery', 'bar'];
    const categoryMap = {
        'restaurant': ['restaurant'],
        'cafe': ['cafe'],
        'bakery': ['bakery'],
        'bar': ['bar'],
        'park': ['park'],
        'museum': ['museum']
    };
    const includedTypes = category && categoryMap[category] ? categoryMap[category] : defaultTypes;

    try {
        // 1. Search Google for nearby places
        const searchResponse = await axios.post(
            'https://places.googleapis.com/v1/places:searchNearby',
            {
                locationRestriction: {
                    circle: {
                        center: { latitude: lat, longitude: lng },
                        radius: 2000.0
                    }
                },
                includedTypes: includedTypes,
                maxResultCount: 10
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_KEY,
                    'X-Goog-FieldMask': 'places.displayName,places.id,places.rating,places.location,places.editorialSummary,places.formattedAddress,places.primaryType'
                }
            }
        );

        const places = searchResponse.data.places || [];
        
        if (places.length === 0) {
            return res.json({ success: false, message: "No places found nearby. Try panning to a different area." });
        }

        // Filter for > 4.0 stars (relaxed from 4.7 to get more results)
        let candidates = places.filter(p => p.rating >= 4.0);
        
        // If no highly rated ones, use all results
        if (candidates.length === 0) {
            candidates = places;
        }

        // Pick a random candidate (not always the first)
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        
        // Build the response — skip reviews/AI to avoid extra failure points
        let reason = "High community rating and authentic local presence.";

        // Try to get reviews for AI analysis (optional — don't fail if this breaks)
        try {
            // The new Places API returns IDs like "places/ChIJ..." — strip prefix for legacy API
            const placeId = target.id.startsWith('places/') ? target.id.substring(7) : target.id;
            
            const detailsResponse = await axios.get(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${GOOGLE_KEY}`,
                { timeout: 5000 }
            );

            const reviews = detailsResponse.data?.result?.reviews || [];
            
            if (reviews.length > 0) {
                const reviewText = reviews.slice(0, 3).map(r => r.text).join("\n\n");
                
                // Try AI analysis (optional)
                try {
                    const aiResponse = await axios.post(AI_RIG_URL, {
                        model: process.env.AI_MODEL_NAME,
                        prompt: `Review Content: ${reviewText}\n\nTask: Determine if this place is a "local gem". Respond with JSON: {"isLocal": true/false, "reason": "short explanation"}.`,
                        stream: false,
                        format: 'json'
                    }, { timeout: 6000 });

                    if (aiResponse.data && aiResponse.data.response) {
                        const aiResult = JSON.parse(aiResponse.data.response);
                        reason = aiResult.reason || reason;
                    }
                } catch (aiError) {
                    console.log("AI Rig unavailable, using default reason:", aiError.message);
                }
            }
        } catch (detailsError) {
            console.log("Place details unavailable, skipping reviews:", detailsError.message);
        }

        // Return the discovery
        res.json({
            success: true,
            data: {
                title: target.displayName?.text || "Hidden Gem",
                desc: target.editorialSummary?.text || target.formattedAddress || "A secret spot favored by locals.",
                lat: target.location?.latitude,
                lng: target.location?.longitude,
                reason: reason,
                type: target.primaryType || category || "discovery"
            }
        });

    } catch (error) {
        console.error("Discovery Error:", error.message);
        if (error.response) {
            console.error("API Response Status:", error.response.status);
            console.error("API Response Data:", JSON.stringify(error.response.data));
        }
        res.status(500).json({ success: false, message: "Backend error during discovery. Check server logs." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Wanderløst Backend running on port ${PORT}`);
});
