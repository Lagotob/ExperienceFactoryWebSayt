const express = require('express');
const { Client } = require('pg');
const cors = require('cors'); // Brauzerdan so'rov kelishiga ruxsat berish uchun

const app = express();
app.use(express.json());
app.use(cors());

const client = new Client({
  user: 'neondb_owner', // Neon konsolidagi foydalanuvchi nomi
  host: 'ep-flat-cake-27097392.us-east-2.aws.neon.tech', // Neon'dagi Host manzili
  database: 'Server', // Bazangiz nomi
  password: 'npg_L9SWxjrCthk3', // Neon'dagi parolingiz
  port: 5432,
  ssl: {
    rejectUnauthorized: false, // Onlayn bazalar uchun SSL shart
  },
});
client.connect()
  .then(() => console.log("PostgreSQL-ga muvaffaqiyatli ulandik!"))
  .catch(err => console.error("Bazaga ulanishda xato:", err.stack));

app.post('/register', async (req, res) => {
  const { name1, username, password, school, viloyat } = req.body;
  
  try {
    const query = `INSERT INTO users (name, username, password, school, viloyat) 
                   VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const values = [name1, username, password, school, viloyat];
    const result = await client.query(query, values);
    
    res.status(200).json({ message: "Muvaffaqiyatli saqlandi!", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server 3000-portda ishlamoqda..."));
