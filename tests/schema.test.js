const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schemaSql = fs.readFileSync(
    path.join(__dirname, '..', 'db', 'schema.sql'),
    'utf8'
);

test('db/schema.sql defines every table, view, trigger, and procedure used by the API', () => {
    const expectedObjects = [
        /CREATE TABLE Meal\b/i,
        /CREATE TABLE Attendance\b/i,
        /CREATE TABLE Food_Prepared\b/i,
        /CREATE TABLE Food_Consumed\b/i,
        /CREATE TABLE Wastage_Log\b/i,
        /CREATE TABLE Prediction\b/i,
        /CREATE TABLE Audit_Log\b/i,
        /CREATE TRIGGER trg_calculate_wastage\b/i,
        /CREATE TRIGGER trg_audit_consumed_del\b/i,
        /CREATE TRIGGER trg_audit_prediction_del\b/i,
        /CREATE VIEW vw_meal_summary\b/i,
        /CREATE VIEW vw_wastage_by_type\b/i,
        /CREATE VIEW vw_daily_trend\b/i,
        /CREATE PROCEDURE GetAutoPredictions\s*\(/i,
        /CREATE PROCEDURE sp_wastage_report\s*\(/i
    ];

    for (const pattern of expectedObjects) {
        assert.match(schemaSql, pattern, `Missing SQL object matching ${pattern}`);
    }
});

test('db/schema.sql enforces 1:1 per-meal uniqueness constraints', () => {
    assert.match(schemaSql, /UNIQUE KEY uq_meal_date_type \(meal_date, meal_type\)/i);
    assert.match(schemaSql, /UNIQUE KEY uq_attendance_meal \(meal_id\)/i);
    assert.match(schemaSql, /UNIQUE KEY uq_prepared_meal \(meal_id\)/i);
    assert.match(schemaSql, /UNIQUE KEY uq_consumed_meal \(meal_id\)/i);
    assert.match(schemaSql, /UNIQUE KEY uq_wastage_meal \(meal_id\)/i);
});

test('db/schema.sql seed inserts match table columns and uses consistent 1.10 prediction buffer', () => {
    assert.doesNotMatch(
        schemaSql,
        /INSERT INTO Food_Prepared\s*\([^)]*\bcost\b/i,
        'Food_Prepared seed should not reference non-existent cost column'
    );
    assert.doesNotMatch(schemaSql, /\*\s*1\.102\b/);
    assert.match(schemaSql, /\*\s*1\.10\b/);
});

