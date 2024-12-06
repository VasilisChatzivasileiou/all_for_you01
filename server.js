const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000; // Use PORT from environment variables if available

// Middleware
app.use(express.json());
app.use(cors());

// PostgreSQL connection setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:picnicinbed990@localhost:5432/quotes_app',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false, // Use SSL in production
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 5000, // Wait up to 5 seconds for a connection
});

// Test database connection
(async () => {
    try {
        await pool.connect();
        console.log('✅ Connected to PostgreSQL database.');
    } catch (err) {
        console.error('❌ Error connecting to the database:', err.message);
        process.exit(1); // Exit the process if the database fails to connect
    }
})();

// Initialize the quotes table if it doesn't exist
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

pool.query(createTableQuery)
    .then(() => console.log('✅ Quotes table initialized successfully.'))
    .catch(err => console.error('❌ Error initializing database:', err.message));

// Root route
app.get('/', (req, res) => {
    res.send("Welcome to the All For You Quotes API! Use '/quotes' to interact with quotes.");
});

// Route to get all quotes
app.get('/quotes', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    try {
        const result = await pool.query(
            'SELECT text, created_at FROM quotes ORDER BY id DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        const quotes = result.rows.map(row => ({
            text: row.text,
            timestamp: new Date(row.created_at).toLocaleString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: true
            }),
        }));
        res.status(200).json(quotes);
    } catch (error) {
        console.error('❌ Error fetching quotes:', error.message);
        res.status(500).json({ error: 'Failed to fetch quotes', details: error.message });
    }
});

// Route to add a new quote
app.post('/quotes', async (req, res) => {
    const { quote } = req.body;

    if (!quote || quote.trim().length === 0) {
        return res.status(400).json({ error: 'Quote is required and cannot be empty.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO quotes (text) VALUES ($1) RETURNING id, text, created_at',
            [quote]
        );

        const newQuote = result.rows[0];
        const formattedTimestamp = new Date(newQuote.created_at).toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true
        });

        res.status(201).json({
            message: 'Quote added successfully.',
            quote: {
                text: newQuote.text,
                timestamp: `Posted on ${formattedTimestamp}`
            }
        });
    } catch (error) {
        console.error('❌ Error adding quote:', error.message);
        res.status(500).json({ error: 'Failed to add quote', details: error.message });
    }
});

// Route to delete all quotes
app.delete('/quotes', async (req, res) => {
    try {
        await pool.query('DELETE FROM quotes');
        res.status(200).json({ message: 'All quotes deleted successfully.' });
    } catch (error) {
        console.error('❌ Error deleting quotes:', error.message);
        res.status(500).json({ error: 'Failed to delete quotes', details: error.message });
    }
});

// Error handling for undefined routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found.' });
});

// General error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unexpected error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred', details: err.message });
});

// Start the server
app.listen(port, () => {
    console.log(`🌟 Server is running on http://localhost:${port}`);
});
