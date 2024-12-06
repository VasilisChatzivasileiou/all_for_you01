const express = require('express');
const { Pool } = require('pg'); // PostgreSQL client
const cors = require('cors');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// PostgreSQL connection setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'your-postgresql-connection-string',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false, // Enables SSL for cloud DBs
});

// Test database connection
pool.connect()
    .then(() => console.log('Connected to PostgreSQL database.'))
    .catch(err => console.error('Error connecting to database:', err));

// Initialize the quotes table if it doesn't exist
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL
    );
`;

pool.query(createTableQuery)
    .then(() => console.log('Quotes table initialized successfully.'))
    .catch(err => console.error('Error initializing database:', err));

// Root route
app.get('/', (req, res) => {
    res.send("Welcome to the All For You Quotes API! Use '/quotes' to get all quotes.");
});

// Route to get all quotes
app.get('/quotes', async (req, res) => {
    try {
        const result = await pool.query('SELECT text FROM quotes');
        const quotes = result.rows.map(row => row.text); // Extract the text field from each row
        res.json(quotes);
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
});

// Route to add a new quote
app.post('/quotes', async (req, res) => {
    const { quote } = req.body;
    if (!quote) {
        return res.status(400).json({ error: "Quote is required" });
    }

    try {
        await pool.query('INSERT INTO quotes (text) VALUES ($1)', [quote]);
        res.status(201).json({ message: "Quote added successfully" });
    } catch (error) {
        console.error('Error adding quote:', error);
        res.status(500).json({ error: 'Failed to add quote' });
    }
});

// Route to delete all quotes
app.delete('/quotes', async (req, res) => {
    try {
        await pool.query('DELETE FROM quotes');
        res.status(200).json({ message: "All quotes deleted successfully" });
    } catch (error) {
        console.error('Error deleting quotes:', error);
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
