// ============================================================
// routes/attendance.js
// Routes for recording student attendance per meal
// ============================================================

const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// ============================================================
// POST /attendance
// Record attendance for a meal
// Body: { students_present: 120, meal_id: 1 }
// ============================================================
router.post('/', async (req, res) => {
    try {
        const { students_present, meal_id } = req.body;

        if (!students_present || !meal_id) {
            return res.status(400).json({ error: 'students_present and meal_id are required' });
        }

        if (parseInt(students_present) < 0) {
            return res.status(400).json({ error: 'students_present cannot be negative' });
        }

        // First check if the meal exists
        const [mealCheck] = await db.execute('SELECT meal_id FROM Meal WHERE meal_id = ?', [meal_id]);
        if (mealCheck.length === 0) {
            return res.status(404).json({ error: `Meal with ID ${meal_id} not found` });
        }

        const sql = 'INSERT INTO Attendance (students_present, meal_id) VALUES (?, ?)';
        const [result] = await db.execute(sql, [students_present, meal_id]);

        res.status(201).json({
            message: '✅ Attendance recorded!',
            attendance_id: result.insertId
        });
    } catch (err) {
        console.error('Error recording attendance:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// ============================================================
// GET /attendance
// Get all attendance records with meal info
// Example of GROUP BY: average attendance per meal type
// ============================================================
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT
                a.attendance_id,
                a.students_present,
                m.meal_date,
                m.meal_type
            FROM Attendance a
            JOIN Meal m ON a.meal_id = m.meal_id
            ORDER BY m.meal_date DESC
        `;
        const [rows] = await db.execute(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET /attendance/avg
// GROUP BY query: average students per meal type
// This is a great DBMS concept to showcase!
// ============================================================
router.get('/avg', async (req, res) => {
    try {
        const sql = `
            SELECT
                m.meal_type,
                ROUND(AVG(a.students_present), 0) AS avg_students,
                MAX(a.students_present)            AS max_students,
                MIN(a.students_present)            AS min_students,
                COUNT(*)                           AS total_records
            FROM Attendance a
            JOIN Meal m ON a.meal_id = m.meal_id
            GROUP BY m.meal_type
            ORDER BY avg_students DESC
        `;
        const [rows] = await db.execute(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
