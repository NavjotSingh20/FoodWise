process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const db = require('../db/connection');
const app = require('../server');

let server;
let baseUrl;
const originalExecute = db.execute.bind(db);

test.before(async () => {
    await new Promise((resolve) => {
        server = http.createServer(app).listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            baseUrl = `http://127.0.0.1:${port}`;
            resolve();
        });
    });
});

test.after(async () => {
    db.execute = originalExecute;
    await new Promise((resolve) => server.close(resolve));
    await db.pool.end();
});

async function api(route, options = {}) {
    const res = await fetch(`${baseUrl}${route}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    });
    const body = await res.json();
    return { status: res.status, body };
}

test('GET /health reports ok when DB responds and 503 when DB fails', async () => {
    db.execute = async () => [[{ ok: 1 }]];
    const okRes = await api('/health');
    assert.equal(okRes.status, 200);
    assert.deepEqual(okRes.body, { status: 'ok', database: 'connected' });

    db.execute = async () => {
        throw new Error('ECONNREFUSED');
    };
    const failRes = await api('/health');
    assert.equal(failRes.status, 503);
    assert.equal(failRes.body.status, 'degraded');
    assert.equal(failRes.body.database, 'disconnected');
});

test('Meals routes: GET /meals, POST /meals validation, creation, and duplicate 409', async () => {
    db.execute = async () => [[{ meal_id: 1, meal_date: '2024-06-10', meal_type: 'Breakfast' }]];
    const listRes = await api('/meals');
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.length, 1);

    const badDate = await api('/meals', {
        method: 'POST',
        body: JSON.stringify({ meal_date: '2024-02-30', meal_type: 'Lunch' })
    });
    assert.equal(badDate.status, 400);

    const badType = await api('/meals', {
        method: 'POST',
        body: JSON.stringify({ meal_date: '2024-06-11', meal_type: 'Brunch' })
    });
    assert.equal(badType.status, 400);

    db.execute = async () => [{ insertId: 4 }];
    const created = await api('/meals', {
        method: 'POST',
        body: JSON.stringify({ meal_date: '2024-06-11', meal_type: 'Lunch' })
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.meal_id, 4);

    db.execute = async () => {
        const err = new Error('Duplicate entry');
        err.code = 'ER_DUP_ENTRY';
        throw err;
    };
    const dup = await api('/meals', {
        method: 'POST',
        body: JSON.stringify({ meal_date: '2024-06-11', meal_type: 'Lunch' })
    });
    assert.equal(dup.status, 409);
});

test('Attendance route: validates input, checks meal existence, and upserts cleanly', async () => {
    const bad = await api('/attendance', {
        method: 'POST',
        body: JSON.stringify({ meal_id: 1, students_present: -5 })
    });
    assert.equal(bad.status, 400);

    db.execute = async () => [[]];
    const missing = await api('/attendance', {
        method: 'POST',
        body: JSON.stringify({ meal_id: 999, students_present: 100 })
    });
    assert.equal(missing.status, 404);

    db.execute = async (sql) => {
        if (sql.includes('FROM Meal')) return [[{ meal_id: 1 }]];
        return [{ insertId: 10, affectedRows: 1 }];
    };
    const created = await api('/attendance', {
        method: 'POST',
        body: JSON.stringify({ meal_id: 1, students_present: 0 })
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.attendance_id, 10);

    db.execute = async (sql) => {
        if (sql.includes('FROM Meal')) return [[{ meal_id: 1 }]];
        return [{ insertId: 10, affectedRows: 2 }];
    };
    const updated = await api('/attendance', {
        method: 'POST',
        body: JSON.stringify({ meal_id: 1, students_present: 120 })
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.message, 'Attendance updated');
});

test('Food routes: validates quantities, supports /food/* and /prepared|/consumed aliases', async () => {
    const zeroPrep = await api('/food/prepared', {
        method: 'POST',
        body: JSON.stringify({ meal_id: 1, quantity_prepared_kg: 0 })
    });
    assert.equal(zeroPrep.status, 400);

    db.execute = async (sql) => {
        if (sql.includes('FROM Meal')) return [[{ meal_id: 1 }]];
        return [{ insertId: 5, affectedRows: 1 }];
    };
    const prepAlias = await api('/prepared', {
        method: 'POST',
        body: JSON.stringify({ meal_id: 1, quantity_prepared_kg: 55.5 })
    });
    assert.equal(prepAlias.status, 201);
    assert.equal(prepAlias.body.prepared_id, 5);

    db.execute = async (sql) => {
        if (sql.includes('FROM Meal')) return [[{ meal_id: 1 }]];
        if (sql.includes('INTO Food_Consumed')) return [{ insertId: 6, affectedRows: 1 }];
        if (sql.includes('FROM Wastage_Log')) return [[{ wastage_kg: '7.50' }]];
        return [[]];
    };
    const consRes = await api('/consumed', {
        method: 'POST',
        body: JSON.stringify({ meal_id: 1, quantity_consumed_kg: 48 })
    });
    assert.equal(consRes.status, 201);
    assert.equal(consRes.body.auto_wastage_kg, '7.50');
});

test('Wastage routes: stats, trend, summary, audit, and report validation', async () => {
    db.execute = async () => [[{
        total_meals_logged: 3,
        total_wasted_kg: '25.00',
        avg_waste_per_student_kg: '0.077',
        total_wastage_entries: 3
    }]];
    const stats = await api('/wastage/stats');
    assert.equal(stats.status, 200);
    assert.equal(stats.body.total_wastage_entries, 3);

    const badRange = await api('/wastage/report', {
        method: 'POST',
        body: JSON.stringify({ start_date: '2024-06-20', end_date: '2024-06-10' })
    });
    assert.equal(badRange.status, 400);

    db.execute = async () => [[[{ meal_id: 1 }], [{ meal_type: 'Breakfast', total_meals: 1 }]]];
    const report = await api('/wastage/report', {
        method: 'POST',
        body: JSON.stringify({ start_date: '2024-06-01', end_date: '2024-06-30' })
    });
    assert.equal(report.status, 200);
    assert.equal(report.body.detail.length, 1);
    assert.equal(report.body.summary.length, 1);
});

test('Predictions routes: /auto stored procedure shape and POST/GET validation', async () => {
    db.execute = async () => [[[]]];
    const emptyAuto = await api('/predictions/auto');
    assert.equal(emptyAuto.status, 200);
    assert.deepEqual(emptyAuto.body.predictions, []);

    db.execute = async () => [[[{ meal_type: 'Lunch', suggested_quantity_kg: 52.8 }]]];
    const auto = await api('/predictions/auto');
    assert.equal(auto.status, 200);
    assert.equal(auto.body.predictions[0].suggested_quantity_kg, 52.8);

    const badPred = await api('/predictions', {
        method: 'POST',
        body: JSON.stringify({
            prediction_date: '2024-06-12',
            meal_type: 'Dinner',
            predicted_students: -1,
            suggested_quantity_kg: 40
        })
    });
    assert.equal(badPred.status, 400);

    db.execute = async () => [{ insertId: 2 }];
    const savedPred = await api('/predictions', {
        method: 'POST',
        body: JSON.stringify({
            prediction_date: '2024-06-12',
            meal_type: 'Dinner',
            predicted_students: 0,
            suggested_quantity_kg: 0
        })
    });
    assert.equal(savedPred.status, 201);
    assert.equal(savedPred.body.prediction_id, 2);
});

test('Error handlers: 400 on invalid JSON and 404 on unknown route', async () => {
    const badJsonRes = await fetch(`${baseUrl}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid'
    });
    assert.equal(badJsonRes.status, 400);

    const notFound = await api('/does-not-exist');
    assert.equal(notFound.status, 404);
});

test('Frontend public/index.html matches backend contracts', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
    assert.match(html, /post\('\/meals',\{meal_date,meal_type\}\)/);
    assert.doesNotMatch(html, /JSON\.stringify\(\{meal_date,type\}\)/);
    assert.doesNotMatch(html, /after_consumed_insert/);
    assert.match(html, /trg_calculate_wastage/);
    assert.match(html, /id="wastage-table"><tr><td colspan="7"/);
    assert.doesNotMatch(html, /id="wastage-table"><tr><td colspan="8"/);
    assert.match(html, /function loadWastage\(\)[\s\S]*?colspan="7"/);
    assert.doesNotMatch(html, /async function loadWastage\(\)[\s\S]{0,400}colspan="8"/);
});
