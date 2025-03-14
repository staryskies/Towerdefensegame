const express = require('express');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000; // Use Render-assigned port

app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' directory

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password, money) VALUES ($1, $2, 0) RETURNING id, username, money',
      [username, hashedPassword]
    );
    const user = result.rows[0];
    await pool.query('INSERT INTO user_towers (user_id, tower) VALUES ($1, $2)', [user.id, 'basic']);
    const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Username already exists or error occurred' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, money: user.money }, process.env.SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/user', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, money FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/towers', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT tower FROM user_towers WHERE user_id = $1', [req.user.id]);
    res.json({ towers: result.rows.map(row => row.tower) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/unlock-tower', authenticateToken, async (req, res) => {
  const { tower } = req.body;
  try {
    const userResult = await pool.query('SELECT money FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    const towerCost = { basic: 0, archer: 225, cannon: 300, sniper: 350, freeze: 400, mortar: 450, laser: 500, tesla: 550, flamethrower: 600, missile: 650, poison: 700, vortex: 750 }[tower];
    if (user.money < towerCost) return res.status(400).json({ message: 'Insufficient funds' });
    await pool.query('UPDATE users SET money = money - $1 WHERE id = $2', [towerCost, req.user.id]);
    await pool.query('INSERT INTO user_towers (user_id, tower) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, tower]);
    res.json({ message: `Unlocked ${tower}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start Express server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// WebSocket setup
const wss = new WebSocketServer({ server });
const parties = new Map();

wss.on('connection', (ws, req) => {
  const token = new URLSearchParams(req.url.split('?')[1]).get('token');
  let user;

  try {
    user = jwt.verify(token, process.env.SECRET_KEY);
    ws.userId = user.id;
    ws.username = user.username;
  } catch (err) {
    ws.close();
    return;
  }

  console.log(`User ${ws.username} connected`);

  ws.on('message', async (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'createParty':
        if (parties.has(data.partyId)) {
          ws.send(JSON.stringify({ type: 'partyError', message: 'Party ID already exists' }));
        } else {
          parties.set(data.partyId, { leader: ws.username, players: [ws], map: data.map, difficulty: data.difficulty });
          ws.send(JSON.stringify({ type: 'partyCreated', partyId: data.partyId }));
        }
        break;

      case 'joinParty':
        const party = parties.get(data.partyId);
        if (!party) {
          ws.send(JSON.stringify({ type: 'partyError', message: 'Party not found' }));
        } else {
          party.players.push(ws);
          ws.partyId = data.partyId;
          ws.send(JSON.stringify({ type: 'partyJoined', partyId: data.partyId, leader: party.leader, started: false }));
          party.players.forEach(client => {
            if (client !== ws) {
              client.send(JSON.stringify({ type: 'playerList', players: party.players.map(p => p.username) }));
            }
          });
        }
        break;

      case 'leaveParty':
        const leavingParty = parties.get(data.partyId);
        if (leavingParty) {
          leavingParty.players = leavingParty.players.filter(client => client !== ws);
          if (leavingParty.players.length === 0) {
            parties.delete(data.partyId);
          } else if (leavingParty.leader === ws.username) {
            leavingParty.leader = leavingParty.players[0].username;
          }
          ws.partyId = null;
        }
        break;

      case 'startGame':
        const startParty = parties.get(data.partyId);
        if (startParty && startParty.leader === ws.username) {
          startParty.players.forEach(client => {
            client.send(JSON.stringify({ type: 'startGame', partyId: data.partyId, map: data.map || startParty.map, difficulty: data.difficulty || startParty.difficulty }));
          });
        }
        break;

      case 'chat':
        const chatParty = parties.get(ws.partyId);
        if (chatParty) {
          chatParty.players.forEach(client => {
            client.send(JSON.stringify({ type: 'chat', username: ws.username, message: data.message }));
          });
        }
        break;
    }
  });

  ws.on('close', () => {
    console.log(`User ${ws.username} disconnected`);
    if (ws.partyId) {
      const party = parties.get(ws.partyId);
      if (party) {
        party.players = party.players.filter(client => client !== ws);
        if (party.players.length === 0) {
          parties.delete(ws.partyId);
        } else if (party.leader === ws.username) {
          party.leader = party.players[0].username;
        }
      }
    }
  });
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});