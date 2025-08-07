
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('frontend'));

app.get('/ai/image-to-video', (req, res) => {
    res.status(404).send('Image-to-Video coming soon.');
});
app.get('/ai/chatbot', (req, res) => {
    res.status(404).send('Chatbot coming soon.');
});
app.get('/shop', (req, res) => {
    res.status(404).send('Merch shop not ready.');
});
app.get('/promo', (req, res) => {
    res.status(404).send('Promo crew not available.');
});
app.get('/identity', (req, res) => {
    res.status(404).send('Brand identity coming.');
});

app.listen(port, () => {
    console.log(`SafeWørd AI server running on port ${port}`);
});
