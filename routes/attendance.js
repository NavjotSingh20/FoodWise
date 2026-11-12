const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { parseIntInRange, ensureMealExists } = require('../utils/validators');

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                a.attendance_id,
                a.meal_id,
                DATE_FORMAT(m.meal_date, '%Y-%m-%d') AS meal_date,
                m.meal_type,
                a.students_present
            FROM Attendance a
            JOIN Meal m ON a.meal_id = m.meal_id
            ORDER BY m.meal_date DESC, a.meal_id DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/avg', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                m.meal_type,
                COUNT(a.attendance_id)             AS total_records,
                ROUND(AVG(a.students_present), 0)  AS avg_students,
                MIN(a.students_present)            AS min_students,
                MAX(a.students_present)            AS max_students
            FROM Attendance a
            JOIN Meal m ON a.meal_id = m.meal_id
            GROUP BY m.meal_type
            ORDER BY m.meal_type
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const mealId = parseIntInRange(req.body.meal_id, { min: 1 });
        if (mealId === null) {
            return res.status(400).json({ error: 'meal_id must be a positive integer' });
        }

        const studentsPresent = parseIntInRange(req.body.students_present, { min: 0 });
        if (studentsPresent === null) {
            return res.status(400).json({ error: 'students_present must be a non-negative integer' });
        }

        if (!(await ensureMealExists(db, mealId))) {
            return res.status(404).json({ error: `Meal with ID ${mealId} not found` });
        }

        const [result] = await db.execute(
            `INSERT INTO Attendance (meal_id, students_present)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE
                 students_present = VALUES(students_present),
                 attendance_id    = LAST_INSERT_ID(attendance_id)`,
            [mealId, studentsPresent]
        );

        const updated = result.affectedRows === 2;
        res.status(updated ? 200 : 201).json({
            message: updated ? 'Attendance updated' : 'Attendance recorded',
            attendance_id: result.insertId
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
