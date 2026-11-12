const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const {
    isValidDateString,
    isValidMealType,
    parseIntInRange,
    parseNumberInRange,
    MEAL_TYPES
} = require('../utils/validators');

// GET /predictions/auto
router.get('/auto', async (req, res) => {
    try {
        const [resultSets] = await db.execute('CALL GetAutoPredictions()');
        const rows = Array.isArray(resultSets[0]) ? resultSets[0] : resultSets;
        if (!rows.length) {
            return res.json({ message: 'Not enough data yet.', predictions: [] });
        }
        res.json({ predictions: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /predictions
router.post('/', async (req, res) => {
    try {
        const {
            prediction_date,
            meal_type,
            predicted_students,
            standard_estimate_kg = 0,
            historical_avg_kg = 0,
            suggested_quantity_kg
        } = req.body;

        if (
            !prediction_date ||
            !meal_type ||
            predicted_students === undefined ||
            suggested_quantity_kg === undefined
        ) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        if (!isValidDateString(prediction_date)) {
            return res.status(400).json({ error: 'prediction_date must be a valid YYYY-MM-DD date' });
        }

        if (!isValidMealType(meal_type)) {
            return res.status(400).json({
                error: `meal_type must be one of: ${MEAL_TYPES.join(', ')}`
            });
        }

        const students = parseIntInRange(predicted_students, { min: 0 });
        const suggestedQty = parseNumberInRange(suggested_quantity_kg, { min: 0 });
        const standardEst = parseNumberInRange(standard_estimate_kg, { min: 0 });
        const historicalAvg = parseNumberInRange(historical_avg_kg, { min: 0 });

        if (students === null || suggestedQty === null || standardEst === null || historicalAvg === null) {
            return res.status(400).json({ error: 'Numeric prediction fields must be valid non-negative values' });
        }

        const [result] = await db.execute(
            `INSERT INTO Prediction
             (prediction_date, meal_type, predicted_students,
              standard_estimate_kg, historical_avg_kg, suggested_quantity_kg)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [prediction_date, meal_type, students, standardEst, historicalAvg, suggestedQty]
        );
        res.status(201).json({ message: 'Prediction saved', prediction_id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /predictions
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT
                prediction_id,
                DATE_FORMAT(prediction_date, '%Y-%m-%d') AS prediction_date,
                meal_type,
                predicted_students,
                standard_estimate_kg,
                historical_avg_kg,
                suggested_quantity_kg
             FROM Prediction
             ORDER BY prediction_id DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
