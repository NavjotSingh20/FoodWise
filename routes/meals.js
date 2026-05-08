const express = require('express');
const router = express.Router();
const db = require('../db/connection');

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
            ORDER BY meal_date DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { meal_date, meal_type } = req.body;

        if (!meal_date || !meal_type) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const [result] = await db.execute(
            `INSERT INTO Meal (meal_date, meal_type) VALUES (?, ?)`,
            [meal_date, meal_type]
        );

        res.json({
            message: "Meal created",
            meal_id: result.insertId
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
