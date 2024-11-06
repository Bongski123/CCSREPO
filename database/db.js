const mysql = require('mysql2/promise');

// Create a connection pool
const db = mysql.createPool({
    host: 'mysql-186603-0.cloudclusters.net',
    port: 10121, // Ensure you're using the correct port if required
    user: 'admin',
    password: 'eoeiBuZJ',
    database: 'ncfrepo_new',
    waitForConnections: true,
    connectionLimit: 10, // You can adjust this if needed
    queueLimit: 0 // No limit on the queue
});

// Test connection to the database
async function testConnection() {
    try {
        // Attempt to get a connection from the pool
        const connection = await db.getConnection();
        console.log('Connected to MySQL!');
        connection.release(); // Don't forget to release the connection back to the pool
    } catch (err) {
        console.error('Error connecting to MySQL:', err);
    }
}

// Call the test connection function
testConnection();

module.exports = db;
