const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// PostgreSQL connection setup
const pool = new Pool({
    connectionString: 'postgresql://postgres.klmmwyugwassiyrpjwsa:B5Z9BQkvLKP0nGx2@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false },
});

// Set the PostgreSQL timezone to UTC (optional)
pool.query("SET timezone = 'UTC';");

// Test database connection
(async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL database.');
        client.release();
    } catch (err) {
        console.error('❌ Error connecting to the database:', err.message);
        process.exit(1); // Exit the process if the database fails to connect
    }
})();

// Initialize the quotes table if it doesn't exist
(async () => {
    try {
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'quotes'
            );
        `);

        if (!tableExists.rows[0].exists) {
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS quotes (
                    id SERIAL PRIMARY KEY,
                    text TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;
            await pool.query(createTableQuery);
            console.log('✅ Quotes table initialized successfully.');
        } else {
            console.log('✅ Quotes table already exists.');
        }
    } catch (err) {
        console.error('❌ Error initializing database:', err.message);
    }
})();

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
            created_at: row.created_at, // Raw timestamp in UTC
            timestamp: new Date(row.created_at).toISOString() // Explicitly return UTC
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
        res.status(201).json({
            message: 'Quote added successfully.',
            quote: {
                text: newQuote.text,
                created_at: newQuote.created_at, // Raw ISO timestamp
                timestamp: new Date(newQuote.created_at).toISOString(), // UTC timestamp
            },
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
