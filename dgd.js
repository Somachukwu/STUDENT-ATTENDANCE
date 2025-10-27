const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.json());

// 🧩 MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "eventdb"
});

db.connect(err => {
  if (err) throw err;
  console.log("✅ Connected to MySQL Database");
});

// 📋 Route to get participants (with optional search, year, day)
app.get("/participants", (req, res) => {
  let { search, year, day } = req.query;
  let sql = "SELECT * FROM participants";
  let conditions = [];

  if (search) {
    conditions.push(`name LIKE '%${search}%'`);
  }

  if (year && day) {
    sql = `
      SELECT p.*, a.year, a.day FROM participants p
      JOIN attended a ON p.id = a.participant_id
      WHERE a.year = ? AND a.day = ?
    `;
    db.query(sql, [year, day], (err, results) => {
      if (err) throw err;
      res.json(results);
    });
    return;
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY name ASC LIMIT 10";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// 🖱️ Mark attendance
app.post("/mark-attendance", (req, res) => {
  const { participant_id, year, day } = req.body;
  const checkSQL = "SELECT * FROM attended WHERE participant_id = ? AND year = ? AND day = ?";
  db.query(checkSQL, [participant_id, year, day], (err, result) => {
    if (err) throw err;

    if (result.length > 0) {
      return res.json({ message: "Already marked" });
    }

    const sql = "INSERT INTO attended (participant_id, year, day) VALUES (?, ?, ?)";
    db.query(sql, [participant_id, year, day], err2 => {
      if (err2) throw err2;
      res.json({ message: "Marked successfully" });
    });
  });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
