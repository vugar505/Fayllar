const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Render PostgreSQL bağlantısı
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Cədvəllərin avtomatik yaradılması
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                user_uid TEXT,
                username TEXT UNIQUE,
                email TEXT,
                pass TEXT,
                secret_word TEXT,
                balance NUMERIC DEFAULT 10.00
            );
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                username TEXT,
                email TEXT,
                product_name TEXT,
                target_id TEXT,
                quantity TEXT,
                total_price TEXT,
                order_date TEXT
            );
        `);
        console.log("Bazanın cədvəlləri uğurla yoxlandı/yaradıldı.");
    } catch (err) {
        console.error("Baza yaratma xətası:", err);
    }
}
initDB();

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. Qeydiyyat API
app.post('/api/register', async (req, res) => {
    const { uid, username, email, secret, pass } = req.body;
    try {
        const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Bu istifadəçi adı artıq mövcuddur.' });
        }
        await pool.query(
            'INSERT INTO users (user_uid, username, email, pass, secret_word, balance) VALUES ($1, $2, $3, $4, $5, 10.00)',
            [uid, username, email, pass, secret]
        );
        res.json({ success: true, message: 'Qeydiyyat uğurludur' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. Giriş API
app.post('/api/login', async (req, res) => {
    const { username, pass } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND pass = $2', [username, pass]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Yanlış istifadəçi adı və ya şifrə.' });
        }
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. İstifadəçiləri gətir
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json([]);
    }
});

// 4. Balans artır
app.post('/api/update-balance', async (req, res) => {
    const { username, amount } = req.body;
    try {
        await pool.query('UPDATE users SET balance = balance + $1 WHERE username = $2', [parseFloat(amount), username]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 5. Sifarişləri gətir
app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json([]);
    }
});

// 6. Yeni sifariş
app.post('/api/orders', async (req, res) => {
    const { username, email, product, target, quantity, total, date } = req.body;
    try {
        await pool.query(
            'INSERT INTO orders (username, email, product_name, target_id, quantity, total_price, order_date) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [username, email, product, target, quantity, total, date]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server işləyir: ${PORT}`);
});
