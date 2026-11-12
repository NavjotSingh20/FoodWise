const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { isValidDateString, parseIntInRange } = require('../utils/validators');

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
        console.error('WASTAGE FETCH ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/summary', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                meal_type,
                total_meals,
                avg_wastage_kg,
                total_wasted_kg,
                max_wastage_kg,
                avg_students
            FROM vw_wastage_by_type
        `);

        res.json(rows);
    } catch (err) {
        console.error('SUMMARY ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/trend', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                DATE_FORMAT(meal_date, '%Y-%m-%d') AS meal_date,
                total_wastage_kg
            FROM vw_daily_trend
        `);

        res.json(rows);
    } catch (err) {
        console.error('TREND ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const [[stats]] = await db.execute(`
            SELECT
                COUNT(*)                                                     AS total_meals_logged,
                COALESCE(ROUND(SUM(wastage_kg), 2), 0)                       AS total_wasted_kg,
                COALESCE(ROUND(AVG(wastage_kg / NULLIF(students_present, 0)), 3), 0) AS avg_waste_per_student_kg,
                (SELECT COUNT(*) FROM Wastage_Log)                           AS total_wastage_entries
            FROM vw_meal_summary
        `);

        res.json(stats);
    } catch (err) {
        console.error('STATS ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/report', async (req, res) => {
    try {
        const { start_date, end_date, hostel_id = 0 } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }

        if (!isValidDateString(start_date) || !isValidDateString(end_date)) {
            return res.status(400).json({
                error: 'start_date and end_date must be valid YYYY-MM-DD dates'
            });
        }

        if (start_date > end_date) {
            return res.status(400).json({
                error: 'start_date must be on or before end_date'
            });
        }

        const parsedHostelId = parseIntInRange(hostel_id, { min: 0 });
        if (parsedHostelId === null) {
            return res.status(400).json({ error: 'hostel_id must be a non-negative integer' });
        }

        const [rows] = await db.execute(
            'CALL sp_wastage_report(?, ?, ?)',
            [start_date, end_date, parsedHostelId]
        );

        res.json({
            detail: rows[0] || [],
            summary: rows[1] || []
        });
    } catch (err) {
        console.error('REPORT ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/audit', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                audit_id,
                table_name,
                action,
                record_id,
                changed_by,
                DATE_FORMAT(changed_at, '%Y-%m-%d %H:%i:%s') AS changed_at
            FROM Audit_Log
            ORDER BY changed_at DESC, audit_id DESC
            LIMIT 50
        `);

        res.json(rows);
    } catch (err) {
        console.error('AUDIT ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
