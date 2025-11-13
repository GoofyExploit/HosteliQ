const express = require('express');
const router = express.Router();

router.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;
        
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/models/gemini-1.5-flash:generateContent?key=AIzaSyCxt-eIUj3D_KXJ41lcB5zSBVeOiiPmdrw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: question }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
            })
        });
        
        const data = await response.json();
        res.json({ response: data.candidates[0].content.parts[0].text });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
