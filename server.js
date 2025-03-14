const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key';
const DATABASE_URL = process.env.DATABASE_URL;
const saltRounds = 10;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const games = new Map();
const parties = new Map();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Missing credentials' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid username or password' });
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid username or password' });
    const token = jwt.sign({ id: user.id, username: user.username, money: user.money }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Missing credentials' });
  try {
    const checkUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (checkUser.rows.length > 0) return res.status(409).json({ message: 'Username taken' });
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const result = await pool.query(
      'INSERT INTO users (username, password, money) VALUES ($1, $2, $3) RETURNING *',
      [username, hashedPassword, 0]
    );
    const user = result.rows[0];
    await pool.query('INSERT INTO user_towers (user_id, tower) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, 'basic']);
    const token = jwt.sign({ id: user.id, username: user.username, money: user.money }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/user', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const result = await pool.query('SELECT username, money FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = result.rows[0];
    res.json({ username: user.username, money: user.money });
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(401).json({ message: 'Invalid token' });
  }
});

app.post('/update-money', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const { money } = req.body;
    await pool.query('UPDATE users SET money = $1 WHERE id = $2', [money, decoded.id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Update money error:', err);
    res.status(401).json({ message: 'Invalid token' });
  }
});

app.get('/towers', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const result = await pool.query('SELECT tower FROM user_towers WHERE user_id = $1', [decoded.id]);
    const towers = result.rows.map(row => row.tower);
    res.json({ towers: towers.length > 0 ? towers : ['basic'] });
  } catch (err) {
    console.error('Towers fetch error:', err);
    res.status(401).json({ message: 'Invalid token' });
  }
});

app.post('/unlock-tower', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const { tower } = req.body;
    const towerStats = {
      basic: 0, archer: 225, cannon: 300, sniper: 350, freeze: 400, mortar: 450,
      laser: 500, tesla: 550, flamethrower: 600, missile: 650, poison: 700, vortex: 750
    };
    if (!towerStats.hasOwnProperty(tower)) return res.status(400).json({ message: 'Invalid tower' });
    const userResult = await pool.query('SELECT money FROM users WHERE id = $1', [decoded.id]);
    const userMoney = userResult.rows[0].money;
    const towerCheck = await pool.query('SELECT * FROM user_towers WHERE user_id = $1 AND tower = $2', [decoded.id, tower]);
    if (towerCheck.rows.length > 0) return res.status(400).json({ message: 'Tower already unlocked' });
    if (userMoney < towerStats[tower]) return res.status(400).json({ message: 'Not enough money' });
    await pool.query('BEGIN');
    await pool.query('UPDATE users SET money = money - $1 WHERE id = $2', [towerStats[tower], decoded.id]);
    await pool.query('INSERT INTO user_towers (user_id, tower) VALUES ($1, $2)', [decoded.id, tower]);
    await pool.query('COMMIT');
    res.json({ message: `Unlocked ${tower}!` });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Unlock tower error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

wss.on('connection', (ws, req) => {
  const token = new URLSearchParams(req.url.split('?')[1]).get('token');
  let userId, username;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    userId = decoded.id;
    username = decoded.username;
  } catch (err) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
    ws.close();
    return;
  }
  ws.userId = userId;
  ws.username = username;

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    switch (data.type) {
      case 'join':
        const gameKey = `${data.map}_${data.difficulty}`;
        if (!games.has(gameKey)) {
          games.set(gameKey, { players: new Set(), towers: [], wave: 1, gameMoney: data.difficulty === 'easy' ? 200 : data.difficulty === 'medium' ? 400 : 600 });
        }
        const game = games.get(gameKey);
        game.players.add(ws);
        ws.gameKey = gameKey;
        broadcastPlayers(game);
        break;

      case 'createParty':
        const { partyId, map, difficulty } = data;
        if (!partyId || parties.has(partyId)) {
          ws.send(JSON.stringify({ type: 'partyError', message: 'Invalid or taken party ID' }));
          return;
        }
        parties.set(partyId, {
          leader: username,
          players: new Set([ws]),
          map: map || 'map1',
          difficulty: difficulty || 'easy',
          towers: [],
          gameMoney: difficulty === 'easy' ? 200 : difficulty === 'medium' ? 400 : 600,
          started: false,
        });
        ws.partyId = partyId;
        ws.send(JSON.stringify({ type: 'partyCreated', partyId, leader: username }));
        broadcastPartyPlayers(partyId);
        break;

      case 'joinParty':
        if (parties.has(data.partyId)) {
          const party = parties.get(data.partyId);
          party.players.add(ws);
          ws.partyId = data.partyId;
          ws.send(JSON.stringify({
            type: 'partyJoined',
            partyId: data.partyId,
            gameMoney: party.gameMoney,
            map: party.map,
            difficulty: party.difficulty,
            started: party.started,
          }));
          broadcastPartyPlayers(data.partyId);
        } else {
          ws.send(JSON.stringify({ type: 'partyError', message: 'Party not found' }));
        }
        break;

      case 'leaveParty':
        if (ws.partyId && parties.has(ws.partyId)) {
          const party = parties.get(ws.partyId);
          party.players.delete(ws);
          if (party.players.size === 0) {
            parties.delete(ws.partyId);
          } else if (party.leader === username) {
            party.leader = Array.from(party.players)[0]?.username || null;
            broadcastPartyPlayers(ws.partyId);
          }
          ws.partyId = null;
        }
        break;

      case 'partyRestart':
        if (ws.partyId && parties.has(ws.partyId)) {
          const party = parties.get(ws.partyId);
          if (party.leader === username) {
            party.towers = [];
            party.gameMoney = party.difficulty === 'easy' ? 200 : party.difficulty === 'medium' ? 400 : 600;
            party.started = false;
            party.players.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'partyRestart', gameMoney: party.gameMoney }));
              }
            });
          }
        }
        break;

      case 'startGame':
        if (ws.partyId && parties.has(ws.partyId)) {
          const party = parties.get(ws.partyId);
          if (party.leader === username && !party.started) {
            party.started = true;
            party.players.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'startGame',
                  partyId: party.partyId,
                  map: party.map,
                  difficulty: party.difficulty,
                  gameMoney: party.gameMoney,
                }));
              }
            });
          }
        }
        break;

      case 'chat':
        if (data.partyId && parties.has(data.partyId)) {
          const party = parties.get(data.partyId);
          party.players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'chat', sender: username, message: data.message }));
            }
          });
        } else if (ws.gameKey && games.has(ws.gameKey)) {
          const game = games.get(ws.gameKey);
          game.players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'chat', sender: username, message: data.message }));
            }
          });
        }
        break;

      case 'placeTower':
        if (data.partyId && parties.has(data.partyId)) {
          const party = parties.get(data.partyId);
          party.towers.push(data.tower);
          party.gameMoney = data.gameMoney;
          party.players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'placeTower', tower: data.tower, gameMoney: data.gameMoney }));
            }
          });
        } else if (ws.gameKey && games.has(ws.gameKey)) {
          const game = games.get(ws.gameKey);
          game.towers.push(data.tower);
          game.players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'placeTower', tower: data.tower }));
            }
          });
        }
        break;

      case 'wave':
        if (ws.partyId && parties.has(ws.partyId)) {
          const party = parties.get(ws.partyId);
          party.players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'wave', wave: data.wave }));
            }
          });
        } else if (ws.gameKey && games.has(ws.gameKey)) {
          const game = games.get(ws.gameKey);
          game.wave = data.wave;
          game.players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'wave', wave: data.wave }));
            }
          });
        }
        break;

      case 'moneyUpdate':
        if (ws.partyId && parties.has(ws.partyId)) {
          const party = parties.get(ws.partyId);
          party.gameMoney = data.gameMoney;
          party.players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'moneyUpdate', gameMoney: data.gameMoney }));
            }
          });
        }
        break;

      case 'mapSelected':
        if (ws.partyId && parties.has(ws.partyId)) {
          const party = parties.get(ws.partyId);
          if (party.leader === username) {
            party.map = data.map;
            party.difficulty = data.difficulty;
            party.gameMoney = data.difficulty === 'easy' ? 200 : data.difficulty === 'medium' ? 400 : 600;
            party.towers = [];
            party.started = false;
            party.players.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'mapSelected', map: data.map, difficulty: data.difficulty }));
              }
            });
          }
        }
        break;

      case 'gameOver':
        if (ws.partyId && parties.has(ws.partyId)) {
          const party = parties.get(ws.partyId);
          party.players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'gameOver', won: data.won }));
            }
          });
        } else if (ws.gameKey && games.has(ws.gameKey)) {
          const game = games.get(ws.gameKey);
          game.players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'gameOver', won: data.won }));
            }
          });
        }
        break;
    }
  });

  ws.on('close', () => {
    if (ws.partyId && parties.has(ws.partyId)) {
      const party = parties.get(ws.partyId);
      party.players.delete(ws);
      if (party.players.size === 0) {
        parties.delete(ws.partyId);
      } else if (party.leader === username) {
        party.leader = Array.from(party.players)[0]?.username || null;
        broadcastPartyPlayers(ws.partyId);
      }
    }
    if (ws.gameKey && games.has(ws.gameKey)) {
      const game = games.get(ws.gameKey);
      game.players.delete(ws);
      if (game.players.size === 0) {
        games.delete(ws.gameKey);
      }
    }
  });
});

function broadcastPlayers(game) {
  const players = Array.from(game.players).map(ws => ws.username);
  game.players.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'playerList', players, leader: players[0] }));
    }
  });
}

function broadcastPartyPlayers(partyId) {
  const party = parties.get(partyId);
  const players = Array.from(party.players).map(ws => ws.username);
  party.players.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'playerList', players, leader: party.leader }));
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));