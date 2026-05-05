const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Neon Dashboard-dan "Connection String"ni nusxalab shu yerga qo'ying
// Diqqat: database nomi 'Server' ekanligiga amin bo'ling, aks holda 'neondb' deb yozing
const connectionString = "postgresql://neondb_owner:npg_EeRjF0XrQU1g@ep-sweet-fog-a1v0nvua-pooler.ap-southeast-1.aws.neon.tech/Server?sslmode=require&channel_binding=require";

const client = new Client({
  connectionString: connectionString,
});

client.connect()
  .then(() => console.log("Neon PostgreSQL-ga muvaffaqiyatli ulandik!"))
  .catch(err => console.error("Bazaga ulanishda xato:", err.message));

app.post('/register', async (req, res) => {
  const { name1, username, password, school, viloyat } = req.body;
  
  try {
    const query = `INSERT INTO users (name, username, password, school, viloyat) 
                   VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const values = [name1, username, password, school, viloyat];
    const result = await client.query(query, values);
    
    res.status(200).json({ message: "Muvaffaqiyatli saqlandi!", user: result.rows[0] });
  } catch (err) {
    console.error("Query xatosi:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server 3000-portda ishlamoqda..."));
