const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Faylların təmiz oxunması üçün yol tənzimləməsi
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// MySQL verilənlər bazası bağlantısı
const db = mysql.createPool({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'as_sosial_db',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Cədvəllərin avtomatik yaradılması
db.query(`
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_uid VARCHAR(20) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) NOT NULL,
        pass VARCHAR(255) NOT NULL,
        secret_word VARCHAR(100) NOT NULL,
        balance DECIMAL(10,2) DEFAULT 10.00,
        total_spent DECIMAL(10,2) DEFAULT 0.00,
        user_level INT DEFAULT 1,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);

db.query(`
    CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        unit INT DEFAULT 1,
        badge VARCHAR(50),
        image_url LONGTEXT
    )
`);

db.query(`
    CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL,
        product_name VARCHAR(100) NOT NULL,
        target_id VARCHAR(100) NOT NULL,
        quantity INT NOT NULL,
        total_price VARCHAR(50) NOT NULL,
        order_status VARCHAR(50) DEFAULT 'Hal-hazırda davam edir',
        order_date VARCHAR(50) NOT NULL
    )
`);

// 1. Qeydiyyat API
app.post('/api/register', (req, res) => {
    const { uid, username, email, secret, pass } = req.body;
    db.query('INSERT INTO users (user_uid, username, email, pass, secret_word) VALUES (?, ?, ?, ?, ?)',
        [uid, username, email, pass, secret], (err, result) => {
            if (err) return res.status(400).json({ success: false, message: 'Bu istifadəçi adı artıq mövcuddur.' });
            res.json({ success: true, message: 'Qeydiyyat uğurludur' });
        });
});

// 2. Giriş API
app.post('/api/login', (req, res) => {
    const { username, pass } = req.body;
    db.query('SELECT * FROM users WHERE username = ? AND pass = ?', [username, pass], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ success: false, message: 'Yanlış istifadəçi adı və ya şifrə.' });
        res.json({ success: true, user: results[0] });
    });
});

// 3. İstifadəçiləri gətir (Admin üçün)
app.get('/api/users', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 4. Balans artır (Admin üçün)
app.post('/api/update-balance', (req, res) => {
    const { username, amount } = req.body;
    db.query('UPDATE users SET balance = balance + ? WHERE username = ?', [amount, username], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// 5. Sifarişləri gətir
app.get('/api/orders', (req, res) => {
    db.query('SELECT * FROM orders', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 6. Yeni sifariş yarat
app.post('/api/orders', (req, res) => {
    const { username, email, product, target, quantity, total, date } = req.body;
    db.query('INSERT INTO orders (username, email, product_name, target_id, quantity, total_price, order_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, email, product, target, quantity, total, date], (err) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true });
        });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server işləyir: ${PORT}`);
});
