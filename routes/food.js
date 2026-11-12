const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const {
    parseIntInRange,
    parseNumberInRange,
    ensureMealExists
} = require('../utils/validators');

/**
 * Shared handler for recording or updating per-meal prepared/consumed quantities.
 */
async function upsertFoodQuantity(req, res, config) {
    try {
        const mealId = parseIntInRange(req.body.meal_id, { min: 1 });
        if (mealId === null) {
            return res.status(400).json({ error: 'meal_id must be a positive integer' });
        }

        const quantity = parseNumberInRange(req.body[config.field], {
            min: 0,
            allowEqualMin: config.allowZero
        });
        if (quantity === null) {
            const constraint = config.allowZero ? 'a non-negative number' : 'greater than 0';
            return res.status(400).json({ error: `${config.field} must be ${constraint}` });
        }

        if (!(await ensureMealExists(db, mealId))) {
            return res.status(404).json({ error: `Meal with ID ${mealId} not found` });
        }

        const [result] = await db.execute(
            `INSERT INTO ${config.table} (meal_id, ${config.column})
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE
                 ${config.column} = VALUES(${config.column}),
                 ${config.idColumn} = LAST_INSERT_ID(${config.idColumn})`,
            [mealId, quantity]
        );

        const updated = result.affectedRows === 2;
        const payload = {
            message: updated ? `${config.label} updated` : `${config.label} recorded`,
            [config.idColumn]: result.insertId
        };

        if (config.includeWastage) {
            const [wl] = await db.execute(
                'SELECT wastage_kg FROM Wastage_Log WHERE meal_id = ? LIMIT 1',
                [mealId]
            );
            payload.auto_wastage_kg = wl[0]?.wastage_kg ?? 0;
        }

        res.status(updated ? 200 : 201).json(payload);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

router.post('/prepared', (req, res) =>
    upsertFoodQuantity(req, res, {
        table: 'Food_Prepared',
        idColumn: 'prepared_id',
        column: 'quantity_prepared_kg',
        field: 'quantity_prepared_kg',
        label: 'Food prepared',
        allowZero: false,
        includeWastage: false
    })
);

router.post('/consumed', (req, res) =>
    upsertFoodQuantity(req, res, {
        table: 'Food_Consumed',
        idColumn: 'consumed_id',
        column: 'quantity_consumed_kg',
        field: 'quantity_consumed_kg',
        label: 'Consumed',
        allowZero: true,
        includeWastage: true
    })
);

module.exports = router;
