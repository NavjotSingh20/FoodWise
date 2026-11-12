const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { isValidDateString, isValidMealType, MEAL_TYPES } = require('../utils/validators');

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                meal_id,
                DATE_FORMAT(meal_date, '%Y-%m-%d') AS meal_date,
                meal_type,
                students_present,
                prepared_kg,
                consumed_kg,
                wastage_kg,
                wastage_percent
            FROM vw_meal_summary
            ORDER BY meal_date DESC, meal_id DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { meal_date } = req.body;
        const meal_type = req.body.meal_type ?? req.body.type;

        if (!meal_date || !meal_type) {
            return res.status(400).json({ error: 'meal_date and meal_type are required' });
        }

        if (!isValidDateString(meal_date)) {
            return res.status(400).json({ error: 'meal_date must be a valid YYYY-MM-DD date' });
        }

        if (!isValidMealType(meal_type)) {
            return res.status(400).json({
                error: `meal_type must be one of: ${MEAL_TYPES.join(', ')}`
            });
        }

        const [result] = await db.execute(
            'INSERT INTO Meal (meal_date, meal_type) VALUES (?, ?)',
            [meal_date, meal_type]
        );

        res.status(201).json({
            message: 'Meal created',
            meal_id: result.insertId
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'A meal for this date and meal_type already exists'
            });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
