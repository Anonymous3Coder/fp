const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const session = require('express-session');
const path = require('path');
const { processPayment } = require('./payments/payment.js');
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Session setup
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Create 'uploads' folder if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// In-memory storage
let users = [{ username: 'admin', password: '1234' }];
let uploadedImages = [];

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        req.session.user = username;
        res.redirect('/index.html');
    } else {
        res.send('Invalid username or password. <a href="/login.html">Try again</a>');
    }
});

// Register route
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const userExists = users.find(u => u.username === username);

    if (userExists) {
        res.send('Username already exists. <a href="/login.html">Go to Login</a>');
    } else {
        users.push({ username, password });
        res.redirect('/login.html');
    }
});

// Upload route
app.post('/upload', (req, res) => {
    if (!req.session.user) {
        return res.send('Please login first. <a href="/login.html">Login</a>');
    }
    upload.single('image')(req, res, () => {
        if (!req.file) {
            res.send('No file uploaded. <a href="/index.html">Go back</a>');
        } else {
            const imagePath = '/uploads/' + req.file.filename;
            const image = {
                path: imagePath,
                isArtwork: req.body.isArtwork === 'on',
                forSale: req.body.forSale === 'on' && req.body.isArtwork === 'on',
                price: req.body.forSale === 'on' && req.body.isArtwork === 'on' ? parseFloat(req.body.price) || 0 : 0
            };
            uploadedImages.push(image);
            res.json({ message: 'Image uploaded successfully!', image });
        }
    });
});

// Get uploaded images
app.get('/get-uploaded-images', (req, res) => {
    res.json(uploadedImages);
});

// Buy image route
app.post('/buy-image', (req, res) => {
    const { imagePath } = req.body;
    if (!req.session.user) {
        return res.send('Please login first. <a href="/login.html">Login</a>');
    }
    const image = uploadedImages.find(img => img.path === imagePath);
    if (!image || !image.forSale) {
        return res.json({ success: false, message: 'Image not available for sale!' });
    }
    processPayment(imagePath, (error, result) => {
        if (error) {
            res.json({ success: false, message: error.message });
        } else {
            res.json({ success: true, message: result.message, downloadLink: imagePath });
        }
    });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});