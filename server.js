const express = require('express');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
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

// Function to check and repopulate database if empty
async function initializeDatabase() {
  try {
    // Check if the users table is empty
    const userCheck = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCheck.rows[0].count, 10);
    console.log(`Found ${userCount} users in the database`);

    if (userCount === 0) {
      console.log('Database is empty. Repopulating with default user...');
      
      // Default user credentials
      const defaultUsername = 'starynightsss';
      const defaultPassword = 'password123'; // Change this for production
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // Insert default user
      const userResult = await pool.query(
        'INSERT INTO users (username, password, money) VALUES ($1, $2, 0) RETURNING id, username, money',
        [defaultUsername, hashedPassword]
      );
      const user = userResult.rows[0];

      // Insert default tower for the user
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
    process.exit(1); // Exit if initialization fails
  }
}

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
    const token = jwt.sign({ id: user.id, username: user.username, money: user.money }, process.env.SECRET_KEY, {
      expiresIn: '1h',
    });
    console.log('Signup successful for:', username);
    res.json({ token });
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
    if (!user) {
      console.log(`No user found for username: ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log(`Password mismatch for username: ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, money: user.money }, process.env.SECRET_KEY, {
      expiresIn: '1h',
    });
    console.log('Login successful for:', username);
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
  console.log('Unlock tower request:', { tower, userId: req.user.id });
  try {
    const userResult = await pool.query('SELECT money FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    const towerCost = {
      basic: 0,
      archer: 225,
      cannon: 300,
      sniper: 350,
      freeze: 400,
      mortar: 450,
      laser: 500,
      tesla: 550,
      flamethrower: 600,
      missile: 650,
      poison: 700,
      vortex: 750,
    }[tower];
    if (towerCost === undefined) {
      return res.status(400).json({ message: 'Invalid tower type' });
    }
    if (user.money < towerCost) {
      return res.status(400).json({ message: 'Insufficient funds' });
    }
    await pool.query('UPDATE users SET money = money - $1 WHERE id = $2', [towerCost, req.user.id]);
    await pool.query(
      'INSERT INTO user_towers (user_id, tower) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, tower]
    );
    console.log(`Tower ${tower} unlocked for user ${req.user.username}`);
    res.json({ message: `Unlocked ${tower}` });
  } catch (err) {
    console.error('Unlock tower error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/update-money', authenticateToken, async (req, res) => {
  const { money } = req.body;
  console.log('Update money request:', { userId: req.user.id, money });
  try {
    await pool.query('UPDATE users SET money = $1 WHERE id = $2', [money, req.user.id]);
    res.json({ message: 'Money updated' });
  } catch (err) {
    console.error('Update money error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start Express server and initialize database
const server = app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await initializeDatabase(); // Run database initialization after server starts
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
    ws.gameMoney = 200;
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
      console.log('WebSocket message received:', data);
    } catch (err) {
      console.error('Invalid WebSocket message:', err.message);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      return;
    }

    const party = ws.partyId ? parties.get(ws.partyId) : null;

    switch (data.type) {
      case 'createParty':
        if (!data.partyId) {
          ws.send(JSON.stringify({ type: 'partyError', message: 'Party ID required' }));
        } else if (parties.has(data.partyId)) {
          ws.send(JSON.stringify({ type: 'partyError', message: 'Party ID already exists' }));
        } else {
          parties.set(data.partyId, {
            leader: ws.username,
            players: [ws],
            map: data.map || 'map1',
            difficulty: data.difficulty || 'easy',
            gameMoney: data.difficulty === 'easy' ? 200 : data.difficulty === 'medium' ? 400 : 600,
          });
          ws.partyId = data.partyId;
          ws.send(JSON.stringify({ type: 'partyCreated', partyId: data.partyId }));
          console.log(`Party ${data.partyId} created by ${ws.username}`);
        }
        break;

      case 'joinParty':
        if (!data.partyId || !parties.has(data.partyId)) {
          ws.send(JSON.stringify({ type: 'partyError', message: 'Party not found' }));
        } else {
          const party = parties.get(data.partyId);
          party.players.push(ws);
          ws.partyId = data.partyId;
          ws.gameMoney = party.gameMoney;
          const playerList = party.players.map(p => p.username);
          ws.send(
            JSON.stringify({
              type: 'partyJoined',
              partyId: data.partyId,
              map: party.map,
              difficulty: party.difficulty,
              gameMoney: party.gameMoney,
              leader: party.leader,
              started: party.players.length > 1,
            })
          );
          party.players.forEach(client => {
            if (client !== ws) {
              client.send(JSON.stringify({ type: 'playerList', players: playerList, leader: party.leader }));
            }
          });
          console.log(`${ws.username} joined party ${data.partyId}`);
        }
        break;

      case 'leaveParty':
        if (party) {
          party.players = party.players.filter(client => client !== ws);
          const playerList = party.players.map(p => p.username);
          if (party.players.length === 0) {
            parties.delete(ws.partyId);
            console.log(`Party ${ws.partyId} deleted (no players)`);
          } else if (party.leader === ws.username) {
            party.leader = party.players[0]?.username || null;
            console.log(`New leader for party ${ws.partyId}: ${party.leader}`);
            party.players.forEach(client =>
              client.send(JSON.stringify({ type: 'playerList', players: playerList, leader: party.leader }))
            );
          }
          ws.partyId = null;
          console.log(`${ws.username} left party ${data.partyId}`);
        }
        break;

      case 'startGame':
        if (party && party.leader === ws.username) {
          party.map = data.map || party.map;
          party.difficulty = data.difficulty || party.difficulty;
          party.gameMoney = data.difficulty === 'easy' ? 200 : data.difficulty === 'medium' ? 400 : 600;
          party.players.forEach(client => {
            client.gameMoney = party.gameMoney;
            client.send(
              JSON.stringify({
                type: 'startGame',
                partyId: data.partyId,
                map: party.map,
                difficulty: party.difficulty,
                gameMoney: party.gameMoney,
              })
            );
          });
          console.log(`Party ${data.partyId} game started by ${ws.username}`);
        } else {
          ws.send(JSON.stringify({ type: 'partyError', message: 'Only the leader can start the game' }));
        }
        break;

      case 'chat':
        if (party) {
          party.players.forEach(client => {
            client.send(JSON.stringify({ type: 'chat', sender: ws.username, message: data.message }));
          });
        }
        break;

      case 'placeTower':
        if (party) {
          party.players.forEach(client => {
            client.send(JSON.stringify({ type: 'placeTower', tower: data.tower, gameMoney: data.gameMoney }));
          });
          party.gameMoney = data.gameMoney;
        }
        break;

      case 'wave':
        if (party) {
          party.players.forEach(client => {
            client.send(JSON.stringify({ type: 'wave', wave: data.wave }));
          });
        }
        break;

      case 'moneyUpdate':
        if (party) {
          party.gameMoney = data.gameMoney;
          party.players.forEach(client => {
            if (client !== ws) {
              client.send(JSON.stringify({ type: 'moneyUpdate', gameMoney: party.gameMoney }));
            }
          });
        }
        break;

      case 'gameOver':
        if (party) {
          party.players.forEach(client => {
            client.send(JSON.stringify({ type: 'gameOver', won: data.won }));
          });
        }
        break;

      case 'partyRestart':
        if (party && party.leader === ws.username) {
          party.gameMoney = party.difficulty === 'easy' ? 200 : data.difficulty === 'medium' ? 400 : 600;
          party.players.forEach(client => {
            client.gameMoney = party.gameMoney;
            client.send(JSON.stringify({ type: 'partyRestart', gameMoney: party.gameMoney }));
          });
          console.log(`Party ${data.partyId} restarted by ${ws.username}`);
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
        const playerList = party.players.map(p => p.username);
        if (party.players.length === 0) {
          parties.delete(ws.partyId);
          console.log(`Party ${ws.partyId} deleted (no players)`);
        } else if (party.leader === ws.username) {
          party.leader = party.players[0]?.username || null;
          console.log(`New leader for party ${ws.partyId}: ${party.leader}`);
          party.players.forEach(client =>
            client.send(JSON.stringify({ type: 'playerList', players: playerList, leader: party.leader }))
          );
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