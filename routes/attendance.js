const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

router.post('/', async (req, res) => {
    try {
        const { students_present, meal_id } = req.body;

        if (meal_id === undefined || students_present === undefined) {
            return res.status(400).json({ error: 'students_present and meal_id are required' });
        }

        if (parseInt(students_present) < 0) {
            return res.status(400).json({ error: 'students_present cannot be negative' });
        }

        const [mealCheck] = await db.execute(
            'SELECT meal_id FROM Meal WHERE meal_id = ?',
            [meal_id]
        );

        if (mealCheck.length === 0) {
            return res.status(404).json({ error: `Meal with ID ${meal_id} not found` });
        }

        const [result] = await db.execute(
            'INSERT INTO Attendance (students_present, meal_id) VALUES (?, ?)',
            [students_present, meal_id]
        );

        res.json({
            message: 'Attendance recorded',
            attendance_id: result.insertId
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
