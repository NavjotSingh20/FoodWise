const MEAL_TYPES = Object.freeze(['Breakfast', 'Lunch', 'Dinner']);

/**
 * Validate that a value is a real calendar date in YYYY-MM-DD format.
 */
function isValidDateString(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const [year, month, day] = value.split('-').map(Number);
    const utc = new Date(Date.UTC(year, month - 1, day));
    return (
        utc.getUTCFullYear() === year &&
        utc.getUTCMonth() === month - 1 &&
        utc.getUTCDate() === day
    );
}

/**
 * Validate that a value matches one of the allowed Meal ENUM types.
 */
function isValidMealType(value) {
    return typeof value === 'string' && MEAL_TYPES.includes(value);
}

/**
 * Parse a strict integer within [min, max], returning null when invalid.
 */
function parseIntInRange(value, { min = -Infinity, max = Infinity } = {}) {
    if (value === null || value === undefined || typeof value === 'boolean') {
        return null;
    }
    if (typeof value === 'string' && value.trim() === '') {
        return null;
    }
    const num = Number(value);
    if (!Number.isInteger(num) || num < min || num > max) {
        return null;
    }
    return num;
}

/**
 * Parse a finite decimal number within bounds, returning null when invalid.
 */
function parseNumberInRange(value, { min = -Infinity, max = Infinity, allowEqualMin = true } = {}) {
    if (value === null || value === undefined || typeof value === 'boolean') {
        return null;
    }
    if (typeof value === 'string' && value.trim() === '') {
        return null;
    }
    const num = Number(value);
    if (!Number.isFinite(num) || num > max) {
        return null;
    }
    if (allowEqualMin ? num < min : num <= min) {
        return null;
    }
    return num;
}

/**
 * Check whether a Meal row exists for the given meal_id.
 */
async function ensureMealExists(db, mealId) {
    const [rows] = await db.execute('SELECT meal_id FROM Meal WHERE meal_id = ?', [mealId]);
    return rows.length > 0;
}

module.exports = {
    MEAL_TYPES,
    isValidDateString,
    isValidMealType,
    parseIntInRange,
    parseNumberInRange,
    ensureMealExists
};
