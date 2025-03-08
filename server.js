const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/towerDefenseDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  money: { type: Number, default: 200 },
});

const User = mongoose.model("User", userSchema);

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, "secretKey", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Sign-Up Endpoint
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).send("User created");
  } catch (err) {
    res.status(400).send("Error creating user");
  }
});

// Login Endpoint
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).send("User not found");

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send("Invalid password");

    const token = jwt.sign({ username: user.username }, "secretKey");
    res.json({ token, money: user.money });
  } catch (err) {
    res.status(500).send("Error logging in");
  }
});

// Get User Data Endpoint
app.get("/user", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    res.json({ money: user.money });
  } catch (err) {
    res.status(500).send("Error fetching user data");
  }
});

// Update Money Endpoint
app.post("/update-money", authenticateToken, async (req, res) => {
  try {
    const { money } = req.body;
    await User.updateOne({ username: req.user.username }, { money });
    res.send("Money updated");
  } catch (err) {
    res.status(500).send("Error updating money");
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});