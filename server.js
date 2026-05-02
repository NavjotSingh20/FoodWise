const express = require('express');
const path    = require('path');

const app  = express();
const PORT = 3000; // port where server will run

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const mealRoutes       = require('./routes/meals');
const attendanceRoutes = require('./routes/attendance');
const foodRoutes       = require('./routes/food');
const wastageRoutes    = require('./routes/wastage');
const predictionRoutes = require('./routes/predictions');

app.use('/meal',        mealRoutes);        // /meal,  /meals
app.use('/meals',       mealRoutes);        // alias
app.use('/attendance',  attendanceRoutes);  // /attendance
app.use('/food',        foodRoutes);        // /food/prepared, /food/consumed
app.use('/prepared',    foodRoutes);        // /prepared (for frontend convenience)
app.use('/consumed',    foodRoutes);        // /consumed (for frontend convenience)
app.use('/wastage',     wastageRoutes);     // /wastage
app.use('/predictions', predictionRoutes);  // /predictions

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});


app.listen(PORT, () => {
    console.log('\nFoodWise Server Started');
    console.log(`Running at: http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop.\n');
});

module.exports = app;
