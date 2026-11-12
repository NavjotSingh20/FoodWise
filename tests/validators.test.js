const test = require('node:test');
const assert = require('node:assert/strict');
const {
    MEAL_TYPES,
    isValidDateString,
    isValidMealType,
    parseIntInRange,
    parseNumberInRange
} = require('../utils/validators');

test('isValidDateString accepts valid YYYY-MM-DD dates and rejects invalid ones', () => {
    assert.equal(isValidDateString('2024-06-10'), true);
    assert.equal(isValidDateString('2024-02-29'), true); // leap year
    assert.equal(isValidDateString('2025-02-29'), false); // non-leap year
    assert.equal(isValidDateString('2024-02-30'), false);
    assert.equal(isValidDateString('2024-13-01'), false);
    assert.equal(isValidDateString('2024-6-10'), false);
    assert.equal(isValidDateString('10-06-2024'), false);
    assert.equal(isValidDateString(''), false);
    assert.equal(isValidDateString(null), false);
});

test('isValidMealType checks against Breakfast, Lunch, Dinner', () => {
    for (const t of MEAL_TYPES) {
        assert.equal(isValidMealType(t), true);
    }
    assert.equal(isValidMealType('breakfast'), false);
    assert.equal(isValidMealType('Snack'), false);
    assert.equal(isValidMealType(''), false);
    assert.equal(isValidMealType(null), false);
});

test('parseIntInRange parses strict integers and rejects floats, blanks, and booleans', () => {
    assert.equal(parseIntInRange(0, { min: 0 }), 0);
    assert.equal(parseIntInRange('120', { min: 0 }), 120);
    assert.equal(parseIntInRange(1, { min: 1 }), 1);
    assert.equal(parseIntInRange(0, { min: 1 }), null);
    assert.equal(parseIntInRange(-1, { min: 0 }), null);
    assert.equal(parseIntInRange(12.5, { min: 0 }), null);
    assert.equal(parseIntInRange('12abc', { min: 0 }), null);
    assert.equal(parseIntInRange('', { min: 0 }), null);
    assert.equal(parseIntInRange('   ', { min: 0 }), null);
    assert.equal(parseIntInRange(true, { min: 0 }), null);
    assert.equal(parseIntInRange(null, { min: 0 }), null);
    assert.equal(parseIntInRange(undefined, { min: 0 }), null);
});

test('parseNumberInRange handles min inclusive vs exclusive bounds', () => {
    assert.equal(parseNumberInRange(0, { min: 0, allowEqualMin: true }), 0);
    assert.equal(parseNumberInRange(0, { min: 0, allowEqualMin: false }), null);
    assert.equal(parseNumberInRange('48.5', { min: 0, allowEqualMin: false }), 48.5);
    assert.equal(parseNumberInRange(-0.1, { min: 0 }), null);
    assert.equal(parseNumberInRange(Infinity, { min: 0 }), null);
    assert.equal(parseNumberInRange(false, { min: 0 }), null);
    assert.equal(parseNumberInRange('', { min: 0 }), null);
});

