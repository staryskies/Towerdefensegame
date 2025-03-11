const express = require("express");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

app.use(express.json());

// PostgreSQL Client Configuration for Render
const client = new Client({
  connectionString: process.env.DATABASE_URL, // Set in Render dashboard
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false, // SSL for Render's DB
});

async function startServer() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL database");
    await initializeDatabase();
  } catch (err) {
    console.error("Error connecting to PostgreSQL:", err);
    process.exit(1); // Exit if connection fails
  }

  // Ensure JWT_SECRET is set
  if (!process.env.JWT_SECRET) {
    console.warn("JWT_SECRET not set. Using default value for development.");
    process.env.JWT_SECRET = "your-secret-key-here"; // Replace with a secure key in Render dashboard
  }

  // Initialize Database Tables
  async function initializeDatabase() {
    try {
      await client.query(`
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
      `);
      console.log("Users and towers tables ready");
    } catch (err) {
      console.error("Error creating tables:", err);
    }
  }

  // Middleware to Authenticate Token
  function authenticateToken(req, res, next) {
    const token = req.headers["authorization"];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: "Invalid token." });
      req.user = user;
      next();
    });
  }

  // API Routes
  app.get("/user", authenticateToken, async (req, res) => {
    try {
      const result = await client.query("SELECT money FROM users WHERE id = $1", [req.user.id]);
      const user = result.rows[0];
      if (!user) return res.status(404).json({ message: "User not found." });
      res.json({ money: user.money });
    } catch (err) {
      console.error("Error fetching user data:", err);
      res.status(500).json({ message: "Error fetching user data." });
    }
  });

  app.get("/towers", authenticateToken, async (req, res) => {
    try {
      const result = await client.query("SELECT tower_type FROM user_towers WHERE user_id = $1", [req.user.id]);
      res.json({ towers: result.rows.map(row => row.tower_type) });
    } catch (err) {
      console.error("Error fetching towers:", err);
      res.status(500).json({ message: "Error fetching towers." });
    }
  });

  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password required." });

    try {
      const result = await client.query("SELECT * FROM users WHERE username = $1", [username]);
      const user = result.rows[0];
      if (!user) return res.status(400).json({ message: "User not found." });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(400).json({ message: "Invalid password." });

      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });
      res.json({ token, money: user.money });
    } catch (err) {
      console.error("Error during login:", err);
      res.status(500).json({ message: "Error logging in." });
    }
  });

  app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password required." });

    try {
      const result = await client.query("SELECT * FROM users WHERE username = $1", [username]);
      if (result.rows[0]) return res.status(400).json({ message: "Username already exists." });

      const hashedPassword = await bcrypt.hash(password, 10);
      const insertResult = await client.query(
        "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
        [username, hashedPassword]
      );
      const user = insertResult.rows[0];
      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });
      res.status(201).json({ token, money: user.money });
    } catch (err) {
      console.error("Error during signup:", err);
      res.status(500).json({ message: "Error creating user." });
    }
  });

  app.post("/update-money", authenticateToken, async (req, res) => {
    const { money } = req.body;
    if (typeof money !== "number" || money < 0) return res.status(400).json({ message: "Invalid money value." });

    try {
      await client.query("UPDATE users SET money = $1 WHERE id = $2", [money, req.user.id]);
      res.json({ message: "Money updated successfully." });
    } catch (err) {
      console.error("Error updating money:", err);
      res.status(500).json({ message: "Error updating money." });
    }
  });

  app.post('/unlock-tower', authenticateToken, async (req, res) => {
    const { tower } = req.body;
    if (!tower || !towerStats[tower]) return res.status(400).json({ message: "Invalid tower type" });
    const user = await User.findById(req.user.userId);
    const cost = towerStats[tower].persistentCost;
    if (user.money < cost) return res.status(400).json({ message: "Insufficient persistent money" });
    if (!user.towers.includes(tower)) {
      user.towers.push(tower);
      user.money -= cost;
      await user.save();
      res.json({ message: `${tower} unlocked`, towers: user.towers });
    } else {
      res.status(400).json({ message: "Tower already unlocked" });
    }
  });

  // Static File Serving
  app.use(express.static(path.join(__dirname, "public")));
  app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
  app.get("/game", (req, res) => res.sendFile(path.join(__dirname, "public", "game.html")));

  // Health Check for Render
  app.get("/health", (req, res) => res.status(200).json({ status: "OK" }));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();