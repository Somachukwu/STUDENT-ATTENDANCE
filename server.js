const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
require('dotenv').config();
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public")); // Serve files from 'public' folder

// ✅ MySQL Connection


const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});



db.connect(err => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    return;
  }
  console.log("✅ Connected to MySQL database");
});

// ✅ Route: Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Route: Admin page
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// ✅ Route: Add student
app.post("/add-student", (req, res) => {
  const { name, email, address, occupation } = req.body;
  const sql =
    "INSERT INTO students (name, email, address, occupation) VALUES (?, ?, ?, ?)";

  db.query(sql, [name, email, address, occupation], (err, result) => {
    if (err) {
      console.error("❌ MySQL Error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json({ message: "✅ Student added successfully!" });
  });
});

// ✅ Route: Search (always fetch from students)
// Filters only affect attendance marking
app.get("/search", (req, res) => {
  const query = req.query.q ? req.query.q.trim() : "";
  const { year, day } = req.query;

  let sql = "";
  let params = [];

  if (query) {
    sql = "SELECT * FROM students WHERE name LIKE ? ORDER BY name ASC";
    params = [`%${query}%`];
  } else {
    sql = "SELECT * FROM students ORDER BY name ASC LIMIT 9";
  }

  db.query(sql, params, (err, students) => {
    if (err) {
      console.error("❌ MySQL Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    // If no date filters provided, just return all students unmarked
    if (!year || !day) return res.json(students.map(s => ({ ...s, marked: false })));

    // Otherwise, join with attendance info
    const attendSql =
      "SELECT student_id FROM attended WHERE year = ? AND day = ?";
    db.query(attendSql, [year, day], (err2, attendedRows) => {
      if (err2) {
        console.error("❌ MySQL Error:", err2);
        return res.status(500).json({ message: "Database error" });
      }

      const attendedIDs = attendedRows.map(a => a.student_id);
      const merged = students.map(s => ({
        ...s,
        marked: attendedIDs.includes(s.id),
      }));

      res.json(merged);
    });
  });
});

// ✅ Route: Toggle attendance (mark/unmark)
app.post("/toggleAttendance/:id", (req, res) => {
  const { id } = req.params;

  // Extract current date (used if filters not provided)
  const now = new Date();
  const year = now.getFullYear();
  const day = now.toISOString().split("T")[0]; // yyyy-mm-dd

  // Check if record exists for this student on this date
  const checkSQL =
    "SELECT * FROM attended WHERE student_id = ? AND year = ? AND day = ?";
  db.query(checkSQL, [id, year, day], (err, rows) => {
    if (err) {
      console.error("❌ MySQL Error:", err);
      return res.status(500).json({ success: false });
    }

    if (rows.length > 0) {
      // Already marked — unmark it
      const delSQL =
        "DELETE FROM attended WHERE student_id = ? AND year = ? AND day = ?";
      db.query(delSQL, [id, year, day], err2 => {
        if (err2) {
          console.error("❌ MySQL Error:", err2);
          return res.status(500).json({ success: false });
        }
        return res.json({ success: true, action: "unmarked" });
      });
    } else {
      // Not marked — mark attendance
      const insSQL =
        "INSERT INTO attended (student_id, year, day) VALUES (?, ?, ?)";
      db.query(insSQL, [id, year, day], err3 => {
        if (err3) {
          console.error("❌ MySQL Error:", err3);
          return res.status(500).json({ success: false });
        }
        return res.json({ success: true, action: "marked" });
      });
    }
  });
});

// ✅ Start Server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
