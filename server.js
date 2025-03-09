const express = require("express");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

app.use(express.json()); // No CORS needed for same-origin

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

client.connect()
  .then(() => {
    console.log("Connected to PostgreSQL database");
    initializeDatabase();
  })
  .catch((err) => console.error("Error connecting to PostgreSQL:", err));

function initializeDatabase() {
  client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      money INTEGER DEFAULT 200
    );
    CREATE TABLE IF NOT EXISTS user_towers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      tower_type TEXT NOT NULL,
      UNIQUE(user_id, tower_type)
    );
  `)
    .then(() => console.log("Users and towers tables ready"))
    .catch((err) => console.error("Error creating tables:", err));
}

function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token." });
    req.user = user;
    next();
  });
}

// API Routes (before static file serving)
app.get("/user", authenticateToken, (req, res) => {
  client.query("SELECT money FROM users WHERE username = $1", [req.user.username])
    .then((result) => {
      const user = result.rows[0];
      if (!user) return res.status(404).json({ message: "User not found." });
      res.json({ money: user.money });
    })
    .catch((err) => {
      console.error("Error fetching user data:", err);
      res.status(500).json({ message: "Error fetching user data." });
    });
});

app.get("/towers", authenticateToken, (req, res) => {
  client.query("SELECT tower_type FROM user_towers WHERE user_id = $1", [req.user.id])
    .then((result) => res.json({ towers: result.rows.map(row => row.tower_type) }))
    .catch((err) => {
      console.error("Error fetching towers:", err);
      res.status(500).json({ message: "Error fetching towers." });
    });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  client.query("SELECT * FROM users WHERE username = $1", [username])
    .then((result) => {
      const user = result.rows[0];
      if (!user) return res.status(400).json({ message: "User not found." });

      bcrypt.compare(password, user.password, (err, valid) => {
        if (err || !valid) return res.status(400).json({ message: "Invalid password." });
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
        res.json({ token, money: user.money });
      });
    })
    .catch((err) => {
      console.error("Error during login:", err);
      res.status(500).json({ message: "Error logging in." });
    });
});

app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  client.query("SELECT * FROM users WHERE username = $1", [username])
    .then((result) => {
      if (result.rows[0]) return res.status(400).json({ message: "Username already exists." });

      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.status(500).json({ message: "Error hashing password." });

        client.query(
          "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
          [username, hashedPassword]
        )
          .then((result) => {
            const user = result.rows[0];
            const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
            res.status(201).json({ token, money: user.money });
          })
          .catch((err) => {
            console.error("Error creating user:", err);
            res.status(500).json({ message: "Error creating user." });
          });
      });
    })
    .catch((err) => {
      console.error("Error during signup:", err);
      res.status(500).json({ message: "Error checking username." });
    });
});

app.post("/update-money", authenticateToken, (req, res) => {
  const { money } = req.body;
  if (typeof money !== "number" || money < 0) return res.status(400).json({ message: "Invalid money value." });

  client.query("UPDATE users SET money = $1 WHERE username = $2", [money, req.user.username])
    .then(() => res.json({ message: "Money updated successfully." }))
    .catch((err) => {
      console.error("Error updating money:", err);
      res.status(500).json({ message: "Error updating money." });
    });
});

app.post("/unlock-tower", authenticateToken, (req, res) => {
  const { towerType, cost } = req.body;
  client.query("SELECT money FROM users WHERE username = $1", [req.user.username])
    .then((result) => {
      const user = result.rows[0];
      if (user.money < cost) return res.status(400).json({ message: "Not enough money." });

      client.query(
        "INSERT INTO user_towers (user_id, tower_type) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [req.user.id, towerType]
      )
        .then(() => {
          client.query("UPDATE users SET money = money - $1 WHERE username = $2", [cost, req.user.username])
            .then(() => res.json({ message: "Tower unlocked successfully." }))
            .catch((err) => {
              console.error("Error updating money:", err);
              res.status(500).json({ message: "Error updating money." });
            });
        })
        .catch((err) => {
          console.error("Error unlocking tower:", err);
          res.status(500).json({ message: "Error unlocking tower." });
        });
    })
    .catch((err) => {
      console.error("Error checking money:", err);
      res.status(500).json({ message: "Error checking money." });
    });
});

// Static file serving (after API routes)
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/game", (req, res) => res.sendFile(path.join(__dirname, "public", "game.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));