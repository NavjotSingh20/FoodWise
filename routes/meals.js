const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const {
    isValidDateString,
    isValidMealType,
    parseIntInRange,
    MEAL_TYPES
} = require('../utils/validators');

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

router.get('/:id', async (req, res) => {
    try {
        const mealId = parseIntInRange(req.params.id, { min: 1 });
        if (mealId === null) {
            return res.status(400).json({ error: 'meal_id must be a positive integer' });
        }

        const [rows] = await db.execute(
            `SELECT
                meal_id,
                DATE_FORMAT(meal_date, '%Y-%m-%d') AS meal_date,
                meal_type,
                students_present,
                prepared_kg,
                consumed_kg,
                wastage_kg,
                wastage_percent
             FROM vw_meal_summary
             WHERE meal_id = ?`,
            [mealId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: `Meal with ID ${mealId} not found` });
        }

        res.json(rows[0]);
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

router.put('/:id', async (req, res) => {
    try {
        const mealId = parseIntInRange(req.params.id, { min: 1 });
        if (mealId === null) {
            return res.status(400).json({ error: 'meal_id must be a positive integer' });
        }

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
            'UPDATE Meal SET meal_date = ?, meal_type = ? WHERE meal_id = ?',
            [meal_date, meal_type, mealId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `Meal with ID ${mealId} not found` });
        }

        res.json({ message: 'Meal updated', meal_id: mealId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'A meal for this date and meal_type already exists'
            });
        }
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const mealId = parseIntInRange(req.params.id, { min: 1 });
        if (mealId === null) {
            return res.status(400).json({ error: 'meal_id must be a positive integer' });
        }

        const [result] = await db.execute('DELETE FROM Meal WHERE meal_id = ?', [mealId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `Meal with ID ${mealId} not found` });
        }

        res.json({ message: 'Meal deleted', meal_id: mealId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
