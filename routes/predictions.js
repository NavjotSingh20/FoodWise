const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// GET /predictions/auto
router.get('/auto', async (req, res) => {
    try {
        const sql = `
            SELECT
                m.meal_type,
                ROUND(AVG(a.students_present), 0)         AS predicted_students,
                ROUND(AVG(a.students_present) * 0.6, 2)   AS standard_estimate_kg,
                ROUND(AVG(fc.quantity_consumed_kg), 2)     AS historical_avg_kg,
                ROUND(AVG(wl.wastage_kg), 2)               AS avg_wastage_kg,
                ROUND(
                    ((AVG(a.students_present) * 0.6) * 0.5
                    + AVG(fc.quantity_consumed_kg) * 0.5)
                    * 1.10
                , 2) AS suggested_quantity_kg
            FROM Meal m
            JOIN Attendance a     ON m.meal_id = a.meal_id
            JOIN Food_Consumed fc ON m.meal_id = fc.meal_id
            JOIN Wastage_Log wl   ON m.meal_id = wl.meal_id
            GROUP BY m.meal_type
            ORDER BY m.meal_type
        `;
        const [rows] = await db.execute(sql);
        if (!rows.length) return res.json({ message: 'Not enough data yet.', predictions: [] });
        res.json({ predictions: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /predictions
router.post('/', async (req, res) => {
    try {
        const { prediction_date, meal_type, predicted_students,
                standard_estimate_kg = 0, historical_avg_kg = 0,
                suggested_quantity_kg } = req.body;

        if (!prediction_date || !meal_type || !predicted_students || !suggested_quantity_kg)
            return res.status(400).json({ error: 'Required fields missing' });

        const [result] = await db.execute(
            `INSERT INTO Prediction
             (prediction_date, meal_type, predicted_students,
              standard_estimate_kg, historical_avg_kg, suggested_quantity_kg)
             VALUES (?,?,?,?,?,?)`,
            [prediction_date, meal_type, predicted_students,
             standard_estimate_kg, historical_avg_kg, suggested_quantity_kg]
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
            `SELECT prediction_id, prediction_date, meal_type,
                    predicted_students, suggested_quantity_kg
             FROM Prediction ORDER BY prediction_id DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
