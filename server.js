// Import required modules
const express = require("express");
const { Client } = require("pg"); // PostgreSQL client
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

// Initialize Express app
const app = express();

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(cors()); // Enable CORS for frontend-backend communication
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from the "public" folder

// Initialize PostgreSQL client
const client = new Client({
  connectionString: process.env.DATABASE_URL, // Use Render's PostgreSQL connection string
  ssl: { rejectUnauthorized: false }, // Required for Render's PostgreSQL
});

// Connect to PostgreSQL database
client.connect()
  .then(() => {
    console.log("Connected to PostgreSQL database");
    initializeDatabase();
  })
  .catch((err) => console.error("Error connecting to PostgreSQL:", err));

// Initialize the database (create tables if they don't exist)
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

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

  jwt.verify(token, "secretKey", (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token." });
    req.user = user;
    next();
  });
}

// Root route - Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Login Endpoint
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Find the user by username
  client.query("SELECT * FROM users WHERE username = $1", [username])
    .then((result) => {
      const user = result.rows[0];
      if (!user) {
        return res.status(400).json({ message: "User not found." });
      }

      // Compare the password
      bcrypt.compare(password, user.password, (err, validPassword) => {
        if (err || !validPassword) {
          return res.status(400).json({ message: "Invalid password." });
        }

        // Generate a JWT token
        const token = jwt.sign({ username: user.username }, "secretKey");

        // Send the token and user data
        res.json({ token, money: user.money });
      });
    })
    .catch((err) => {
      console.error("Error during login:", err);
      res.status(500).json({ message: "Error logging in." });
    });
});

// Sign-Up Endpoint
app.post("/signup", (req, res) => {
  const { username, password } = req.body;

  // Check if the username already exists
  client.query("SELECT * FROM users WHERE username = $1", [username])
    .then((result) => {
      const existingUser = result.rows[0];
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists." });
      }

      // Hash the password
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error("Error hashing password:", err);
          return res.status(500).json({ message: "Error creating user." });
        }

        // Create a new user
        client.query(
          "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
          [username, hashedPassword]
        )
          .then((result) => {
            const newUser = result.rows[0];

            // Generate a JWT token
            const token = jwt.sign({ username }, "secretKey");

            // Send the token and user data
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

// Get User Data Endpoint
app.get("/user", authenticateToken, (req, res) => {
  const { username } = req.user;

  // Find the user by username
  client.query("SELECT * FROM users WHERE username = $1", [username])
    .then((result) => {
      const user = result.rows[0];
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Send the user's money
      res.json({ money: user.money });
    })
    .catch((err) => {
      console.error("Error fetching user data:", err);
      res.status(500).json({ message: "Error fetching user data." });
    });
});

// Update Money Endpoint
app.post("/update-money", authenticateToken, (req, res) => {
  const { username } = req.user;
  const { money } = req.body;

  // Validate the money value
  if (typeof money !== "number" || money < 0) {
    return res.status(400).json({ message: "Invalid money value." });
  }

  // Update the user's money
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

// Serve the game page
app.get("/game", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "game.html"));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});