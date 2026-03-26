const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Postgres Pool with SSL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Initialize Table (Clean Lowercase Schema for maximum compatibility)
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS weight_logs (
                id SERIAL PRIMARY KEY,
                log_date DATE NOT NULL,
                weight DECIMAL(10,2) NOT NULL,
                phase VARCHAR(20) NOT NULL,
                calories INT NOT NULL
            )
        `);
        console.log('Postgres initialized successfully.');
    } catch (err) {
        console.error('Init error:', err.message);
    }
}
initDB();

// API Routes
app.get('/entries', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM weight_logs ORDER BY log_date DESC, id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/entries', async (req, res) => {
    const { log_date, weight, phase, calories } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO weight_logs (log_date, weight, phase, calories) VALUES ($1, $2, $3, $4) RETURNING id',
            [log_date, weight, phase, calories]
        );
        res.json({ id: result.rows[0].id, message: 'Log entry saved successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/entries/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM weight_logs WHERE id = $1', [req.params.id]);
        res.json({ message: 'Entry removed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
