const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Initialize SQLite database
const db = new sqlite3.Database('./quotes.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        // Create the quotes table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL
        )`);
    }
});

// Route to get all quotes
app.get('/quotes', (req, res) => {
    db.all('SELECT text FROM quotes', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch quotes' });
        }
        const quotes = rows.map(row => row.text);
        res.json(quotes);
    });
});

// Route to add a new quote
app.post('/quotes', (req, res) => {
    const { quote } = req.body;
    if (!quote) {
        return res.status(400).json({ error: "Quote is required" });
    }
    db.run('INSERT INTO quotes (text) VALUES (?)', [quote], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to add quote' });
        }
        res.status(201).json({ message: "Quote added successfully" });
    });
});

app.delete('/quotes', (req, res) => {
    db.run('DELETE FROM quotes', [], function (err) {
        if (err) {
            return res.status(500).json({ error: "Failed to delete quotes" });
        }
        res.status(200).json({ message: "All quotes deleted successfully" });
    });
});




// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
