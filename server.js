const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 3000;

// Path to the JSON file that will store the quotes
const quotesFilePath = './quotes.json';

// Middleware
app.use(express.json());
app.use(cors());

// Initialize the JSON file if it doesn't exist
if (!fs.existsSync(quotesFilePath)) {
    fs.writeFileSync(quotesFilePath, JSON.stringify([]), 'utf8'); // Create an empty array for quotes
    console.log('Initialized quotes.json file.');
}

// Helper function to read quotes from the JSON file
const readQuotes = () => {
    const data = fs.readFileSync(quotesFilePath, 'utf8');
    return JSON.parse(data);
};

// Helper function to write quotes to the JSON file
const writeQuotes = (quotes) => {
    fs.writeFileSync(quotesFilePath, JSON.stringify(quotes, null, 2), 'utf8');
};

// Root route
app.get('/', (req, res) => {
    res.send("Welcome to the All For You Quotes API! Use '/quotes' to get all quotes.");
});

// Route to get all quotes
app.get('/quotes', (req, res) => {
    try {
        const quotes = readQuotes();
        res.json(quotes);
    } catch (error) {
        console.error('Error reading quotes:', error);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
});

// Route to add a new quote
app.post('/quotes', (req, res) => {
    const { quote } = req.body;
    if (!quote) {
        return res.status(400).json({ error: "Quote is required" });
    }

    try {
        const quotes = readQuotes();
        quotes.push(quote); // Add the new quote to the list
        writeQuotes(quotes); // Save the updated quotes list
        res.status(201).json({ message: "Quote added successfully" });
    } catch (error) {
        console.error('Error adding quote:', error);
        res.status(500).json({ error: 'Failed to add quote' });
    }
});

// Route to delete all quotes
app.delete('/quotes', (req, res) => {
    try {
        writeQuotes([]); // Overwrite the JSON file with an empty array
        res.status(200).json({ message: "All quotes deleted successfully" });
    } catch (error) {
        console.error('Error deleting quotes:', error);
        res.status(500).json({ error: "Failed to delete quotes" });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
