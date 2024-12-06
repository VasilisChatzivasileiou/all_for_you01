const express = require('express');
const { Pool } = require('pg'); // PostgreSQL client
const cors = require('cors');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'] // Adjust this for production if needed
}));

// PostgreSQL connection setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:picnicinbed990@localhost:5432/quotes_app',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Test database connection
pool.connect()
    .then(() => console.log('Connected to PostgreSQL database.'))
    .catch(err => {
        console.error('Error connecting to database:', err);
        // process.exit(1); // Optionally remove process exit to keep server running on db connection failure
    });

// Initialize the quotes table if it doesn't exist
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

pool.query(createTableQuery)
    .then(() => console.log('Quotes table initialized successfully.'))
    .catch(err => console.error('Error initializing database:', err));

// Root route
app.get('/', (req, res) => {
    res.send("Welcome to the All For You Quotes API! Use '/quotes' to interact with quotes.");
});

// Route to get all quotes
app.get('/quotes', async (req, res) => {
    try {
        // Corrected to use 'created_at' instead of 'timestamp'
        const result = await pool.query('SELECT text, created_at FROM quotes ORDER BY id DESC'); // Use 'created_at' here
        const quotes = result.rows.map(row => {
            const formattedTimestamp = new Date(row.created_at).toLocaleString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: true
            });
            return {
                text: row.text,
                timestamp: `Posted on ${formattedTimestamp}`
            };
        });
        res.json(quotes);
    } catch (error) {
        console.error('Error fetching quotes:', error.message);
        res.status(500).json({ error: 'Failed to fetch quotes', details: error.message });
    }
});

// Route to add a new quote
app.post('/quotes', async (req, res) => {
    const { quote } = req.body;
    if (!quote || quote.trim().length === 0) {
        return res.status(400).json({ error: "Quote is required and cannot be empty" });
    }

    try {
        const result = await pool.query(
            'INSERT INTO quotes (text) VALUES ($1) RETURNING id, text, timestamp',
            [quote]
        );
        const newQuote = result.rows[0];
        const formattedTimestamp = new Date(newQuote.timestamp).toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true
        });
        res.status(201).json({
            message: "Quote added successfully",
            quote: newQuote.text,
            timestamp: `Posted on ${formattedTimestamp}`
        });
    } catch (error) {
        console.error('Error adding quote:', error.message);
        res.status(500).json({ error: 'Failed to add quote' });
    }
});

// Route to delete all quotes
app.delete('/quotes', async (req, res) => {
    try {
        await pool.query('DELETE FROM quotes');
        res.status(200).json({ message: "All quotes deleted successfully" });
    } catch (error) {
        console.error('Error deleting quotes:', error.message);
        res.status(500).json({ error: "Failed to delete quotes" });
    }
});

// Error handling for undefined routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
