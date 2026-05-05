const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // HTML fayllar 'public' papkasida bo'lishi kerak

// PostgreSQL Client
const client = new Client({
  connectionString: process.env.DATABASE_URL, // Render Environment Variables-dan oladi
});

client.connect()
  .then(() => console.log("Neon PostgreSQL-ga muvaffaqiyatli ulandik!"))
  .catch(err => console.error("Bazaga ulanishda xato:", err.message));

// Register API
app.post('/', async (req, res) => {
  const { name1, username, password, school, viloyat } = req.body;
  
  console.log("Kelgan ma'lumot:", req.body); // Render loglarida ko'rinadi

  if (!username || !password) {
    return res.status(400).json({ error: "Username va password to'ldirilishi shart!" });
  }

  try {
    const query = `INSERT INTO users (name, username, password, school, viloyat) 
                   VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const values = [name1, username, password, school, viloyat];
    
    const result = await client.query(query, values);
    console.log("Bazaga saqlandi:", result.rows[0]);
    
    res.status(200).json({ message: "Saqlandi!", user: result.rows[0] });
  } catch (err) {
    console.error("SQL xatosi:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server ${PORT}-portda ishlamoqda...`);
});
