const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Verify environment variables
if (!process.env.SECRET_KEY) {
  console.error('Error: SECRET_KEY environment variable is not set');
  process.exit(1);
}
console.log('SECRET_KEY:', process.env.SECRET_KEY ? 'Set' : 'Not set');

// Function to initialize database schema and populate if empty
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        money INTEGER DEFAULT 0
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_towers (
        user_id INTEGER REFERENCES users(id),
        tower VARCHAR(50),
        PRIMARY KEY (user_id, tower)
      );
    `);
    console.log('Database schema ensured (tables created if missing)');

    const userCheck = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCheck.rows[0].count, 10);
    console.log(`Found ${userCount} users in the database`);

    if (userCount === 0) {
      console.log('Database is empty. Repopulating with default user...');
      const defaultUsername = 'starynightsss';
      const defaultPassword = 'password123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const userResult = await pool.query(
        'INSERT INTO users (username, password, money) VALUES ($1, $2, 0) RETURNING id, username, money',
        [defaultUsername, hashedPassword]
      );
      const user = userResult.rows[0];

      await pool.query(
        'INSERT INTO user_towers (user_id, tower) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [user.id, 'basic']
      );

      console.log(`Default user '${defaultUsername}' created with 'basic' tower`);
    } else {
      console.log('Database already populated. Skipping initialization.');
    }
  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
}

// Routes
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  console.log('Signup request:', { username });
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password, money) VALUES ($1, $2, 0) RETURNING id, username, money',
      [username, hashedPassword]
    );
    const user = result.rows[0];
    await pool.query(
      'INSERT INTO user_towers (user_id, tower) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user.id, 'basic']
    );
    console.log('Signup successful for:', username);
    res.json({ username: user.username });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(400).json({ message: 'Username already exists or error occurred' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login request:', { username });
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log(`Invalid credentials for username: ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log('Login successful for:', username);
    res.json({ username: user.username });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/user', async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ message: 'Username required' });
  }
  try {
    const result = await pool.query('SELECT id, username, money FROM users WHERE username = $1', [username]);
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('User fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/towers', async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ message: 'Username required' });
  }
  try {
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const result = await pool.query('SELECT tower FROM user_towers WHERE user_id = $1', [user.id]);
    res.json({ towers: result.rows.map(row => row.tower) });
  } catch (err) {
    console.error('Towers fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/unlock-tower', async (req, res) => {
  const { username, tower } = req.body;
  console.log('Unlock tower request:', { username, tower });
  if (!username || !tower) {
    return res.status(400).json({ message: 'Username and tower required' });
  }
  try {
    const userResult = await pool.query('SELECT id, money FROM users WHERE username = $1', [username]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });
    const towerCost = {
      basic: 0, archer: 225, cannon: 300, sniper: 350, freeze: 400,
      mortar: 450, laser: 500, tesla: 550, flamethrower: 600, missile: 650,
      poison: 700, vortex: 750,
    }[tower];
    if (towerCost === undefined) return res.status(400).json({ message: 'Invalid tower type' });
    if (user.money < towerCost) return res.status(400).json({ message: 'Insufficient funds' });
    await pool.query('UPDATE users SET money = money - $1 WHERE id = $2', [towerCost, user.id]);
    await pool.query(
      'INSERT INTO user_towers (user_id, tower) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user.id, tower]
    );
    console.log(`Tower ${tower} unlocked for ${username}`);
    res.json({ message: `Unlocked ${tower}` });
  } catch (err) {
    console.error('Unlock tower error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/update-money', async (req, res) => {
  const { username, money } = req.body;
  console.log('Update money request:', { username, money });
  if (!username || money === undefined) {
    return res.status(400).json({ message: 'Username and money required' });
  }
  try {
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await pool.query('UPDATE users SET money = $1 WHERE id = $2', [money, user.id]);
    res.json({ message: 'Money updated' });
  } catch (err) {
    console.error('Update money error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start Express server and initialize database
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await initializeDatabase();
});

// Handle server errors
app.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});