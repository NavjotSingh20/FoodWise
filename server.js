require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db/connection');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const mealRoutes = require('./routes/meals');
const attendanceRoutes = require('./routes/attendance');
const foodRoutes = require('./routes/food');
const wastageRoutes = require('./routes/wastage');
const predictionRoutes = require('./routes/predictions');

app.use('/meal', mealRoutes);
app.use('/meals', mealRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/food', foodRoutes);
app.post('/prepared', (req, res, next) => {
    req.url = '/prepared';
    foodRoutes(req, res, next);
});
app.post('/consumed', (req, res, next) => {
    req.url = '/consumed';
    foodRoutes(req, res, next);
});
app.use('/wastage', wastageRoutes);
app.use('/predictions', predictionRoutes);

app.get('/health', async (req, res) => {
    try {
        await db.execute('SELECT 1 AS ok');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(503).json({
            status: 'degraded',
            database: 'disconnected',
            error: err.message
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
    db.verifyConnection().catch((err) => {
        console.error('Database connection failed:', err.message);
    });

    app.listen(PORT, () => {
        console.log('\nFoodWise Server Started');
        console.log(`Running at: http://localhost:${PORT}`);
        console.log('Press Ctrl+C to stop.\n');
    });
}

module.exports = app;
