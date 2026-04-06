// server.js - Express backend
// DATABASE_URL muhit o'zgaruvchisida (masalan Neon PostgreSQL). Kodga parol qo'ymang.
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const connectionString = process.env.DATABASE_URL;
const pool = connectionString
    ? new Pool({ connectionString })
    : null;

if (!pool) {
    console.warn('[EXP] DATABASE_URL o\'rnatilmagan — DB talab qiladigan /api/* 503 qaytaradi (tasks API uchun statik ro\'yxat beriladi).');
}

const DEFAULT_TASKS_FALLBACK = [
    { id: 1, title: "Algoritmlar Asosi", description: "C++ tilida 5 ta saralash algoritmini yozing.", difficulty: "oson", reward_xp: 250, tech_stack: "C++" },
    { id: 2, title: "Baza Bilan Ishlash", description: "PostgreSQL da murakkab JOIN so'rovlarini bajaring.", difficulty: "orta", reward_xp: 400, tech_stack: "SQL" },
    { id: 3, title: "Web Scraper", description: "Python yordamida biror saytdan ma'lumot yig'uvchi bot yarating.", difficulty: "qiyin", reward_xp: 600, tech_stack: "Python" },
    { id: 4, title: "React Komponentlar", description: "5 ta qayta ishlatiladigan React komponenti yozing.", difficulty: "oson", reward_xp: 300, tech_stack: "React" },
    { id: 5, title: "REST API", description: "Node.js va Express bilan to'liq REST API yarating.", difficulty: "orta", reward_xp: 500, tech_stack: "Node.js" },
    { id: 6, title: "Telegram Bot", description: "Python yoki Node.js da funksional Telegram bot yarating.", difficulty: "qiyin", reward_xp: 750, tech_stack: "Telegram API" }
];

// ============ USERS API ============

// Barcha foydalanuvchilarni olish
app.get('/api/users', async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_URL sozlanmagan' });
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY xp DESC');
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Bitta foydalanuvchini olish
app.get('/api/users/:id', async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_URL sozlanmagan' });
    try {
        const result = await pool.query('SELECT * FROM users WHERE user_id = $1 OR username = $1', [req.params.id]);
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(404).json({ success: false, error: "User not found" });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Yangi foydalanuvchi qo'shish
app.post('/api/users', async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_URL sozlanmagan' });
    const { username, full_name, password, region, school } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (username, full_name, password, region, school, xp, coins, level, completed_tasks, warnings_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [username, full_name, password, region, school, 0, 0, 1, 0, 0]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Foydalanuvchini yangilash
app.put('/api/users/:id', async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_URL sozlanmagan' });
    const { xp, coins, completed_tasks, warnings_count, level } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET xp = $1, coins = $2, completed_tasks = $3, warnings_count = $4, level = $5 WHERE user_id = $6 RETURNING *',
            [xp, coins, completed_tasks, warnings_count, level, req.params.id]
        );
        if (!result.rows.length) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_URL sozlanmagan' });
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(401).json({ success: false, error: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============ TASKS API ============

// Barcha topshiriqlarni olish
app.get('/api/tasks', async (req, res) => {
    if (!pool) {
        return res.json({ success: true, tasks: DEFAULT_TASKS_FALLBACK });
    }
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY id');
        res.json({ success: true, tasks: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: true, tasks: DEFAULT_TASKS_FALLBACK });
    }
});

// ============ SUBMISSIONS API ============

// Yechim yuborish
app.post('/api/submissions', async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_URL sozlanmagan' });
    const { worker_id, task_id, task_title, solution_link } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO quest_submissions (worker_id, quest_name, proof_type, proof_content, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [worker_id, task_title, 'link', solution_link, 'pending']
        );
        res.json({ success: true, submission: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============ LEADERBOARD API ============

// Global reyting
app.get('/api/leaderboard', async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_URL sozlanmagan', users: [] });
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY xp DESC LIMIT 100');
        res.json({ success: true, users: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// HTML/CSS/JS (loyiha ildizi) — Render.com va boshqa hostingda sahifalar ochilishi uchun.
const rootStatic = express.static(path.join(__dirname), { index: 'index.html' });
app.use((req, res, next) => {
    const p = req.path || '';
    if (p.includes('node_modules') || p.includes('..')) return next();
    if (/^\/(package(-lock)?\.json|server\.js)$/i.test(p)) return next();
    rootStatic(req, res, next);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});