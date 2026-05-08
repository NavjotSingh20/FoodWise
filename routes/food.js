const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

router.post('/prepared', async (req, res) => {
    try {
        const { meal_id, quantity_prepared_kg } = req.body;

        if (meal_id === undefined || quantity_prepared_kg === undefined) {
            return res.status(400).json({ error: 'meal_id and quantity_prepared_kg required' });
        }

        const [r] = await db.execute(
            'INSERT INTO Food_Prepared (meal_id, quantity_prepared_kg) VALUES (?,?)',
            [meal_id, quantity_prepared_kg]
        );

        res.json({
            message: 'Food prepared recorded',
            prepared_id: r.insertId
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// POST /food/consumed
router.post('/consumed', async (req, res) => {
    try {
        const { meal_id, quantity_consumed_kg } = req.body;

        if (meal_id === undefined || quantity_consumed_kg === undefined) {
            return res.status(400).json({ error: 'meal_id and quantity_consumed_kg required' });
        }

        const [r] = await db.execute(
            'INSERT INTO Food_Consumed (meal_id, quantity_consumed_kg) VALUES (?,?)',
            [meal_id, quantity_consumed_kg]
        );

        const [wl] = await db.execute(
            'SELECT wastage_kg FROM Wastage_Log WHERE meal_id = ? LIMIT 1',
            [meal_id]
        );

        res.json({
            message: 'Consumed recorded',
            consumed_id: r.insertId,
            auto_wastage_kg: wl[0]?.wastage_kg ?? 0
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
