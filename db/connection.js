// ============================================================
// db/connection.js
// This file creates and exports our MySQL database connection.
// We use a "pool" which is like a group of connections -
// more efficient than creating a new connection every request.
// ============================================================

const mysql = require('mysql2');

// Create a connection pool
// A pool keeps several connections ready so your app is fast
const pool = mysql.createPool({
    host: 'localhost',       // Where MySQL is running (your own computer)
    user: 'root',            // Your MySQL username (change if different)
    password: 'Navjot@SQL123',            // Your MySQL password (change to yours)
    database: 'foodwise_db', // The database name we created in schema.sql
    waitForConnections: true,
    connectionLimit: 10,     // Max 10 connections at once
    queueLimit: 0
});

// .promise() lets us use async/await instead of callbacks
// async/await is much easier to read and understand
const promisePool = pool.promise();

// Test the connection when the server starts
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.log('Make sure MySQL is running and credentials are correct!');
    } else {
        console.log('✅ Connected to MySQL database: foodwise_db');
        connection.release(); // Release the connection back to the pool
    }
});

// Export so other files can use this connection
module.exports = promisePool;
