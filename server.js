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
  if (!token) {
    console.log('No token provided in request');
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const user = jwt.verify(token, process.env.SECRET_KEY);
    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Routes
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  console.log('Signup request:', { username }); // Debug
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
    await pool.query('INSERT INTO user_towers (user_id, tower) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, 'basic']);
    const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '1h' });
    console.log('Signup successful for:', username); // Debug
    res.json({ token });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(400).json({ message: 'Username already exists or error occurred' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login request:', { username }); // Debug
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username81]);
    const user = result.rows[0];
    if (!user) {
      console.log(`No user found for username: ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log(`Password mismatch for username: ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, money: user.money }, process.env.SECRET_KEY, { expiresIn: '1h' });
    console.log('Login successful for:', username); // Debug
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/user', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, money FROM users WHERE id = $1', [req.user.id]);
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('User fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/towers', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT tower FROM user_towers WHERE user_id = $1', [req.user.id]);
    res.json({ towers: result.rows.map(row => row.tower) });
  } catch (err) {
    console.error('Towers fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/unlock-tower', authenticateToken, async (req, res) => {
  const { tower } = req.body;
  console.log('Unlock tower request:', { tower, userId: req.user.id }); // Debug
  try {
    const userResult = await pool.query('SELECT money FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    const towerCost = { basic: 0, archer: 225, cannon: 300, sniper: 350, freeze: 400, mortar: 450, laser: 500, tesla: 550, flamethrower: 600, missile: 650, poison: 700, vortex: 750 }[tower];
    if (!towerCost && towerCost !== 0) {
      return res.status(400).json({ message: 'Invalid tower type' });
    }
    if (user.money < towerCost) {
      return res.status(400).json({ message: 'Insufficient funds' });
    }
    await pool.query('UPDATE users SET money = money - $1 WHERE id = $2', [towerCost, req.user.id]);
    await pool.query('INSERT INTO user_towers (user_id, tower) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, tower]);
    console.log(`Tower ${tower} unlocked for user ${req.user.username}`);
    res.json({ message: `Unlocked ${tower}` });
  } catch (err) {
    console.error('Unlock tower error:', err.message);
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
    console.error('WebSocket connection rejected:', err.message);
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
    ws.close(1008, 'Invalid token');
    return;
  }

  console.log(`User ${ws.username} connected via WebSocket`);

  ws.on('message', async (message) => {
    let data;
    try {
      data = JSON.parse(message);
      console.log('WebSocket message received:', data); // Debug
    } catch (err) {
      console.error('Invalid WebSocket message:', err.message);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      return;
    }

    switch (data.type) {
      case 'createParty':
        if (!data.partyId) {
          ws.send(JSON.stringify({ type: 'partyError', message: 'Party ID required' }));
        } else if (parties.has(data.partyId)) {
          ws.send(JSON.stringify({ type: 'partyError', message: 'Party ID already exists' }));
        } else {
          parties.set(data.partyId, { leader: ws.username, players: [ws], map: data.map || 'map1', difficulty: data.difficulty || 'easy' });
          ws.send(JSON.stringify({ type: 'partyCreated', partyId: data.partyId }));
          console.log(`Party ${data.partyId} created by ${ws.username}`);
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
          console.log(`${ws.username} joined party ${data.partyId}`);
        }
        break;

      case 'leaveParty':
        const leavingParty = parties.get(data.partyId);
        if (leavingParty) {
          leavingParty.players = leavingParty.players.filter(client => client !== ws);
          if (leavingParty.players.length === 0) {
            parties.delete(data.partyId);
            console.log(`Party ${data.partyId} deleted (no players)`);
          } else if (leavingParty.leader === ws.username) {
            leavingParty.leader = leavingParty.players[0]?.username || null;
            console.log(`New leader for party ${data.partyId}: ${leavingParty.leader}`);
          }
          ws.partyId = null;
          console.log(`${ws.username} left party ${data.partyId}`);
        }
        break;

      case 'startGame':
        const startParty = parties.get(data.partyId);
        if (startParty && startParty.leader === ws.username) {
          startParty.players.forEach(client => {
            client.send(JSON.stringify({ type: 'startGame', partyId: data.partyId, map: data.map || startParty.map, difficulty: data.difficulty || startParty.difficulty }));
          });
          console.log(`Party ${data.partyId} game started by ${ws.username}`);
        } else {
          ws.send(JSON.stringify({ type: 'partyError', message: 'Only the leader can start the game' }));
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

      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for ${ws.username}:`, err.message);
  });

  ws.on('close', (code, reason) => {
    console.log(`User ${ws.username} disconnected. Code: ${code}, Reason: ${reason}`);
    if (ws.partyId) {
      const party = parties.get(ws.partyId);
      if (party) {
        party.players = party.players.filter(client => client !== ws);
        if (party.players.length === 0) {
          parties.delete(ws.partyId);
          console.log(`Party ${ws.partyId} deleted (no players)`);
        } else if (party.leader === ws.username) {
          party.leader = party.players[0]?.username || null;
          console.log(`New leader for party ${ws.partyId}: ${party.leader}`);
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