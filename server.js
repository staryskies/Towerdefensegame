const express = require("express");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

app.use(express.json());

// PostgreSQL Client Configuration for Render
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function startServer() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL on Render");
    await initializeDatabase();
  } catch (err) {
    console.error("Error connecting to PostgreSQL:", err);
    process.exit(1);
  }

  if (!process.env.JWT_SECRET) {
    console.warn("JWT_SECRET not set. Using default for development.");
    process.env.JWT_SECRET = "your-secret-key-here"; // Replace with a secure key in production
  }

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
      console.log("Database tables initialized");
    } catch (err) {
      console.error("Error creating tables:", err);
      throw err;
    }
  }

  // Authentication middleware
  function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Expect "Bearer TOKEN"
    if (!token) return res.status(401).json({ message: "No token provided" });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: "Invalid token" });
      req.user = user;
      next();
    });
  }

  // API Routes
  app.get("/user", authenticateToken, async (req, res) => {
    try {
      const result = await client.query("SELECT money FROM users WHERE id = $1", [req.user.id]);
      const user = result.rows[0];
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ money: user.money });
    } catch (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/towers", authenticateToken, async (req, res) => {
    try {
      const result = await client.query("SELECT tower_type FROM user_towers WHERE user_id = $1", [req.user.id]);
      res.json({ towers: result.rows.map(row => row.tower_type) });
    } catch (err) {
      console.error("Error fetching towers:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Missing credentials" });
    try {
      const result = await client.query("SELECT * FROM users WHERE username = $1", [username]);
      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });
      res.json({ token, money: user.money });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Missing credentials" });
    try {
      const result = await client.query("SELECT * FROM users WHERE username = $1", [username]);
      if (result.rows.length > 0) return res.status(400).json({ message: "Username taken" });
      const hashedPassword = await bcrypt.hash(password, 10);
      const insertResult = await client.query(
        "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
        [username, hashedPassword]
      );
      const user = insertResult.rows[0];
      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });
      res.status(201).json({ token, money: user.money });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/update-money", authenticateToken, async (req, res) => {
    const { money } = req.body;
    if (typeof money !== "number" || money < 0) return res.status(400).json({ message: "Invalid money value" });
    try {
      await client.query("UPDATE users SET money = $1 WHERE id = $2", [money, req.user.id]);
      res.json({ message: "Money updated" });
    } catch (err) {
      console.error("Update money error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/unlock-tower", authenticateToken, async (req, res) => {
    const { tower } = req.body;
    const towerStats = {
      basic: { persistentCost: 0 },
      archer: { persistentCost: 225 },
      cannon: { persistentCost: 300 },
      sniper: { persistentCost: 350 },
      freeze: { persistentCost: 400 },
      mortar: { persistentCost: 450 },
      laser: { persistentCost: 500 },
      tesla: { persistentCost: 550 },
      flamethrower: { persistentCost: 600 },
      missile: { persistentCost: 650 },
      poison: { persistentCost: 700 },
      vortex: { persistentCost: 750 },
    };
    if (!tower || !towerStats[tower]) return res.status(400).json({ message: "Invalid tower type" });
    try {
      const userResult = await client.query("SELECT money FROM users WHERE id = $1", [req.user.id]);
      const user = userResult.rows[0];
      if (!user) return res.status(404).json({ message: "User not found" });
      const cost = towerStats[tower].persistentCost;
      if (user.money < cost) return res.status(400).json({ message: "Insufficient money" });
      const towerCheck = await client.query(
        "SELECT * FROM user_towers WHERE user_id = $1 AND tower_type = $2",
        [req.user.id, tower]
      );
      if (towerCheck.rows.length > 0) return res.status(400).json({ message: "Tower already unlocked" });
      await client.query("INSERT INTO user_towers (user_id, tower_type) VALUES ($1, $2)", [req.user.id, tower]);
      await client.query("UPDATE users SET money = money - $1 WHERE id = $2", [cost, req.user.id]);
      const towersResult = await client.query("SELECT tower_type FROM user_towers WHERE user_id = $1", [req.user.id]);
      res.json({ message: `${tower} unlocked`, towers: towersResult.rows.map(row => row.tower_type) });
    } catch (err) {
      console.error("Unlock tower error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Serve static files
  app.use(express.static(path.join(__dirname, "public")));
  app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
  app.get("/game", (req, res) => res.sendFile(path.join(__dirname, "public", "game.html")));

  app.get("/health", (req, res) => res.status(200).json({ status: "OK" }));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();