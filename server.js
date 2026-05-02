// ============================================================
// server.js  ←  THIS IS THE MAIN FILE (run this to start)
// FoodWise: Hostel Food Wastage Analytics System
//
// How to run: node server.js
// Then open: http://localhost:3000
// ============================================================

// 'require' is how Node.js imports packages (like import in other languages)
const express = require('express');
const path    = require('path');  // Built-in Node.js module for file paths

// Create the Express application
const app  = express();
const PORT = 3000; // The port your server will run on

// ============================================================
// MIDDLEWARE
// Middleware runs before your route handlers.
// Think of it as pre-processing for every request.
// ============================================================

// This lets Express understand JSON data sent from the frontend
app.use(express.json());

// This lets Express understand form data (HTML forms)
app.use(express.urlencoded({ extended: true }));

// This serves static files (HTML, CSS, JS) from the "public" folder
// So http://localhost:3000/index.html will load public/index.html
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// ROUTES
// Import and use our route files
// Each route file handles a group of related URLs
// ============================================================

const mealRoutes       = require('./routes/meals');
const attendanceRoutes = require('./routes/attendance');
const foodRoutes       = require('./routes/food');
const wastageRoutes    = require('./routes/wastage');
const predictionRoutes = require('./routes/predictions');

// Mount routes at specific URL prefixes
app.use('/meal',        mealRoutes);        // /meal,  /meals
app.use('/meals',       mealRoutes);        // alias
app.use('/attendance',  attendanceRoutes);  // /attendance
app.use('/food',        foodRoutes);        // /food/prepared, /food/consumed
app.use('/prepared',    foodRoutes);        // /prepared  ← for frontend convenience
app.use('/consumed',    foodRoutes);        // /consumed  ← for frontend convenience
app.use('/wastage',     wastageRoutes);     // /wastage
app.use('/predictions', predictionRoutes);  // /predictions

// ============================================================
// HOMEPAGE
// Serves the main HTML file when someone visits "/"
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// 404 HANDLER
// If no route matched, send a friendly error
// ============================================================
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// ============================================================
// GLOBAL ERROR HANDLER
// Catches any unhandled errors and sends a clean response
// ============================================================
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ============================================================
// START THE SERVER
// Listen on PORT and print a message when ready
// ============================================================
app.listen(PORT, () => {
    console.log('\n🍱 FoodWise Server Started!');
    console.log(`📡 Running at: http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop.\n');
});

module.exports = app;
