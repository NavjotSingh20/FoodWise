// routes/wastage.js (FINAL CLEAN VERSION)

const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');


// ==========================
// GET /wastage (MAIN TABLE - FIXED DATE)
// ==========================
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
        console.error("WASTAGE FETCH ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


// ==========================
// GET /wastage/summary (FIXED)
// ==========================
router.get('/summary', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                meal_type,
                COUNT(meal_id) AS total_meals,
                ROUND(AVG(COALESCE(wastage_kg,0)),2) AS avg_wastage_kg,
                ROUND(SUM(COALESCE(wastage_kg,0)),2) AS total_wasted_kg,
                ROUND(MAX(COALESCE(wastage_kg,0)),2) AS max_wastage_kg,
                ROUND(AVG(students_present),0) AS avg_students
            FROM vw_meal_summary
            GROUP BY meal_type
        `);

        res.json(rows);
    } catch (err) {
        console.error("SUMMARY ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


// ==========================
// GET /wastage/trend (DATE FIXED)
// ==========================
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
        console.error("TREND ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


// ==========================
// GET /wastage/stats (FIXED)
// ==========================
router.get('/stats', async (req, res) => {
    try {
        const [[stats]] = await db.execute(`
            SELECT 
                COUNT(*) AS total_meals_logged,
                ROUND(SUM(wastage_kg),2) AS total_wasted_kg,
                ROUND(AVG(wastage_kg / NULLIF(students_present,0)),3) AS avg_waste_per_student_kg
            FROM vw_meal_summary
        `);

        res.json(stats);
    } catch (err) {
        console.error("STATS ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


// ==========================
// POST /wastage/report
// ==========================
router.post('/report', async (req, res) => {
    try {
        const { start_date, end_date, hostel_id = 0 } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({
                error: 'start_date and end_date required'
            });
        }

        const [rows] = await db.execute(
            'CALL sp_wastage_report(?, ?, ?)',
            [start_date, end_date, hostel_id]
        );

        res.json({
            detail: rows[0],
            summary: rows[1]
        });

    } catch (err) {
        console.error("REPORT ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


// ==========================
// GET /wastage/audit
// ==========================
router.get('/audit', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                audit_id,
                table_name,
                action,
                record_id,
                changed_by,
                DATE_FORMAT(changed_at, '%Y-%m-%d') AS changed_at
            FROM Audit_Log
            ORDER BY changed_at DESC
            LIMIT 50
        `);

        res.json(rows);
    } catch (err) {
        console.error("AUDIT ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;