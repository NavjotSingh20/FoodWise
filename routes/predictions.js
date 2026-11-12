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

/**
 * Validate and normalize prediction payload for create/update routes.
 */
function parsePredictionPayload(body) {
    const {
        prediction_date,
        meal_type,
        predicted_students,
        standard_estimate_kg = 0,
        historical_avg_kg = 0,
        suggested_quantity_kg
    } = body;

    if (
        !prediction_date ||
        !meal_type ||
        predicted_students === undefined ||
        suggested_quantity_kg === undefined
    ) {
        return { error: 'Required fields missing' };
    }

    if (!isValidDateString(prediction_date)) {
        return { error: 'prediction_date must be a valid YYYY-MM-DD date' };
    }

    if (!isValidMealType(meal_type)) {
        return { error: `meal_type must be one of: ${MEAL_TYPES.join(', ')}` };
    }

    const students = parseIntInRange(predicted_students, { min: 0 });
    const suggestedQty = parseNumberInRange(suggested_quantity_kg, { min: 0 });
    const standardEst = parseNumberInRange(standard_estimate_kg, { min: 0 });
    const historicalAvg = parseNumberInRange(historical_avg_kg, { min: 0 });

    if (students === null || suggestedQty === null || standardEst === null || historicalAvg === null) {
        return { error: 'Numeric prediction fields must be valid non-negative values' };
    }

    return {
        value: {
            prediction_date,
            meal_type,
            predicted_students: students,
            standard_estimate_kg: standardEst,
            historical_avg_kg: historicalAvg,
            suggested_quantity_kg: suggestedQty
        }
    };
}

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
        const parsed = parsePredictionPayload(req.body);
        if (parsed.error) {
            return res.status(400).json({ error: parsed.error });
        }

        const p = parsed.value;
        const [result] = await db.execute(
            `INSERT INTO Prediction
             (prediction_date, meal_type, predicted_students,
              standard_estimate_kg, historical_avg_kg, suggested_quantity_kg)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                p.prediction_date,
                p.meal_type,
                p.predicted_students,
                p.standard_estimate_kg,
                p.historical_avg_kg,
                p.suggested_quantity_kg
            ]
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

// PUT /predictions/:id
router.put('/:id', async (req, res) => {
    try {
        const predictionId = parseIntInRange(req.params.id, { min: 1 });
        if (predictionId === null) {
            return res.status(400).json({ error: 'prediction_id must be a positive integer' });
        }

        const parsed = parsePredictionPayload(req.body);
        if (parsed.error) {
            return res.status(400).json({ error: parsed.error });
        }

        const p = parsed.value;
        const [result] = await db.execute(
            `UPDATE Prediction
             SET prediction_date = ?, meal_type = ?, predicted_students = ?,
                 standard_estimate_kg = ?, historical_avg_kg = ?, suggested_quantity_kg = ?
             WHERE prediction_id = ?`,
            [
                p.prediction_date,
                p.meal_type,
                p.predicted_students,
                p.standard_estimate_kg,
                p.historical_avg_kg,
                p.suggested_quantity_kg,
                predictionId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `Prediction with ID ${predictionId} not found` });
        }

        res.json({ message: 'Prediction updated', prediction_id: predictionId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /predictions/:id
router.delete('/:id', async (req, res) => {
    try {
        const predictionId = parseIntInRange(req.params.id, { min: 1 });
        if (predictionId === null) {
            return res.status(400).json({ error: 'prediction_id must be a positive integer' });
        }

        const [result] = await db.execute(
            'DELETE FROM Prediction WHERE prediction_id = ?',
            [predictionId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `Prediction with ID ${predictionId} not found` });
        }

        res.json({ message: 'Prediction deleted', prediction_id: predictionId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
