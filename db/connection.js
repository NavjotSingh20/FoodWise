require('dotenv').config();
const mysql = require('mysql2');

const dbName = process.env.DB_NAME || 'foodwise_db';

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS ?? '',
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
});

const promisePool = pool.promise();

/**
 * Verify MySQL connectivity; called on server startup.
 */
async function verifyConnection() {
    const connection = await promisePool.getConnection();
    try {
        await connection.ping();
        console.log(`Connected to MySQL database: ${dbName}`);
    } finally {
        connection.release();
    }
}

promisePool.pool = pool;
promisePool.verifyConnection = verifyConnection;

module.exports = promisePool;
