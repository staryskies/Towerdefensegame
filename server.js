const express = require("express");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Update origin for production if frontend is hosted separately
app.use(express.static(path.join(__dirname, "public")));

// PostgreSQL client
const client = new Client({
  connectionString: process.env.DATABASE_URL || "postgres://localhost:5432/tower_defense",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
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
    )
  `)
    .then(() => console.log("Users table ready"))
    .catch((err) => console.error("Error creating users table:", err));
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
  if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

  jwt.verify(token, process.env.JWT_SECRET || "secretKey", (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token." });
    req.user = user;
    next();
  });
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  client.query("SELECT * FROM users WHERE username = $1", [username])
    .then((result) => {
      const user = result.rows[0];
      if (!user) {
        return res.status(400).json({ message: "User not found." });
      }

      bcrypt.compare(password, user.password, (err, validPassword) => {
        if (err || !validPassword) {
          return res.status(400).json({ message: "Invalid password." });
        }

        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET || "secretKey");
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
      if (result.rows[0]) {
        return res.status(400).json({ message: "Username already exists." });
      }

      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error("Error hashing password:", err);
          return res.status(500).json({ message: "Error creating user." });
        }

        client.query(
          "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
          [username, hashedPassword]
        )
          .then((result) => {
            const newUser = result.rows[0];
            const token = jwt.sign({ username }, process.env.JWT_SECRET || "secretKey");
            res.status(201).json({ token, money: newUser.money });
          })
          .catch((err) => {
            console.error("Error creating user:", err);
            res.status(500).json({ message: "Error creating user." });
          });
      });
    })
    .catch((err) => {
      console.error("Error during signup:", err);
      res.status(500).json({ message: "Error creating user." });
    });
});

app.get("/user", authenticateToken, (req, res) => {
  const { username } = req.user;

  client.query("SELECT * FROM users WHERE username = $1", [username])
    .then((result) => {
      const user = result.rows[0];
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
      res.json({ money: user.money });
    })
    .catch((err) => {
      console.error("Error fetching user data:", err);
      res.status(500).json({ message: "Error fetching user data." });
    });
});

app.post("/update-money", authenticateToken, (req, res) => {
  const { username } = req.user;
  const { money } = req.body;

  if (typeof money !== "number" || money < 0) {
    return res.status(400).json({ message: "Invalid money value." });
  }

  client.query(
    "UPDATE users SET money = $1 WHERE username = $2",
    [money, username]
  )
    .then(() => {
      res.json({ message: "Money updated successfully." });
    })
    .catch((err) => {
      console.error("Error updating money:", err);
      res.status(500).json({ message: "Error updating money." });
    });
});

app.get("/game", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "game.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});