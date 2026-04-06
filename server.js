// server.js - Express backend
// DATABASE_URL: Render / tizim muhiti yoki loyiha ildizidagi .env (dotenv)
try {
    require('dotenv').config();
} catch (e) {
    /* dotenv paketi o'rnatilmagan bo'lsa ham server ishga tushsin */
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '3mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const connectionString = process.env.DATABASE_URL;
const pool = connectionString
    ? new Pool({ connectionString })
    : null;

// Salomatlik: brauzer ma'lumotlar bazasi ulangan-yuqligini biladi
app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        database: Boolean(pool),
        hint: pool ? null : 'Set DATABASE_URL in .env (local) or Render Environment (Neon PostgreSQL).'
    });
});

if (!pool) {
    console.warn('[EXP] DATABASE_URL o\'rnatilmagan — DB talab qiladigan /api/* 503 qaytaradi (tasks API uchun statik ro\'yxat beriladi).');
}

function omitPassword(row) {
    if (!row || typeof row !== 'object') return row;
    const u = { ...row };
    delete u.password;
    return u;
}

async function ensureUserSchema() {
    if (!pool) return;
    try {
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();
        `);
        await pool.query(`UPDATE users SET last_seen_at = NOW() WHERE last_seen_at IS NULL`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data TEXT DEFAULT ''`);
    } catch (err) {
        console.error('[EXP] users schema migration:', err.message);
    }
}

function scheduleInactiveAccountPurge() {
    const run = async () => {
        if (!pool) return;
        try {
            const r = await pool.query(`
                DELETE FROM users
                WHERE last_seen_at IS NOT NULL
                  AND last_seen_at < NOW() - INTERVAL '1 year'
            `);
            if (r.rowCount > 0) {
                console.log('[EXP] 1 yildan ortiq kirilmagan akkauntlar olib tashlandi:', r.rowCount);
            }
        } catch (err) {
            console.error('[EXP] inactive purge:', err.message);
        }
    };
    setTimeout(run, 60 * 1000);
    setInterval(run, 24 * 60 * 60 * 1000);
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
        res.json({ success: true, users: result.rows.map(omitPassword) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Bitta foydalanuvchini olish
app.get('/api/users/:id', async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_URL sozlanmagan' });
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE user_id::text = $1 OR username = $1',
            [req.params.id]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, user: omitPassword(result.rows[0]) });
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

// Foydalanuvchini yangilash (barcha qurilmalar uchun PostgreSQL — manba)
app.put('/api/users/:id', async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_URL sozlanmagan' });
    try {
        const found = await pool.query(
            'SELECT * FROM users WHERE user_id::text = $1 OR username = $1',
            [req.params.id]
        );
        if (!found.rows.length) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        const cur = found.rows[0];
        const b = req.body || {};
        const xp = b.xp !== undefined ? b.xp : cur.xp;
        const coins = b.coins !== undefined ? b.coins : cur.coins;
        const completed_tasks = b.completed_tasks !== undefined ? b.completed_tasks : cur.completed_tasks;
        const warnings_count = b.warnings_count !== undefined ? b.warnings_count : cur.warnings_count;
        const level = b.level !== undefined ? b.level : cur.level;
        const full_name = b.full_name !== undefined ? b.full_name : cur.full_name;
        const bio = b.bio !== undefined ? b.bio : (cur.bio != null ? cur.bio : '');
        const avatar_data = b.avatar_data !== undefined ? b.avatar_data : (cur.avatar_data != null ? cur.avatar_data : '');
        let password = cur.password;
        if (b.password !== undefined && String(b.password).length > 0) {
            password = b.password;
        }
        const result = await pool.query(
            `UPDATE users SET xp = $1, coins = $2, completed_tasks = $3, warnings_count = $4, level = $5,
             full_name = $6, bio = $7, avatar_data = $8, password = $9
             WHERE user_id = $10 RETURNING *`,
            [xp, coins, completed_tasks, warnings_count, level, full_name, bio, avatar_data, password, cur.user_id]
        );
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
            const user = result.rows[0];
            await pool.query('UPDATE users SET last_seen_at = NOW() WHERE user_id = $1', [user.user_id]);
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, error: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Oxirgi faollik (1 yil qoidasi uchun). Brauzer sessiyasida chaqiriladi.
app.post('/api/ping', async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_URL sozlanmagan' });
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'username va password kerak' });
    }
    try {
        const r = await pool.query(
            `UPDATE users SET last_seen_at = NOW()
             WHERE username = $1 AND password = $2
             RETURNING user_id`,
            [username, password]
        );
        if (r.rowCount === 0) {
            return res.status(401).json({ success: false, error: 'Not authorized' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Hisobni o'chirish (parol tasdiqlangan bo'lsa)
app.delete('/api/users/:id', async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_URL sozlanmagan' });
    const { password } = req.body || {};
    if (!password) {
        return res.status(400).json({ success: false, error: 'password kerak' });
    }
    const idParam = req.params.id;
    try {
        const found = await pool.query(
            'SELECT user_id, password FROM users WHERE user_id::text = $1 OR username = $1',
            [idParam]
        );
        if (found.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        if (found.rows[0].password !== password) {
            return res.status(401).json({ success: false, error: 'Invalid password' });
        }
        const userId = found.rows[0].user_id;
        try {
            await pool.query('DELETE FROM quest_submissions WHERE worker_id::text = $1', [String(userId)]);
        } catch (subErr) {
            if (subErr.code !== '42P01') {
                console.warn('[EXP] quest_submissions delete:', subErr.message);
            }
        }
        await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
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
        res.json({ success: true, users: result.rows.map(omitPassword) });
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

ensureUserSchema()
    .then(() => {
        scheduleInactiveAccountPurge();
    })
    .catch(() => {})
    .finally(() => {
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    });