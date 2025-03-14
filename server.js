const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const SECRET_KEY = 'your-secret-key'; // Replace with your actual secret

// Store game state
const games = new Map(); // Map<map_difficulty_key, { players: Set<WebSocket>, towers: [], wave: number, gameMoney: number }>
const parties = new Map(); // Map<partyId, { leader: string, players: Set<WebSocket>, map: string, difficulty: string, towers: [], gameMoney: number }>

// Middleware to serve static files
app.use(express.static('public'));
app.use(express.json());

// User routes (simplified)
app.get('/user', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Unauthorized');
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    res.json({ username: decoded.username, money: decoded.money || 0 });
  } catch (err) {
    res.status(401).send('Invalid token');
  }
});

app.post('/update-money', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Unauthorized');
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    decoded.money = req.body.money;
    res.sendStatus(200);
  } catch (err) {
    res.status(401).send('Invalid token');
  }
});

// WebSocket connection
wss.on('connection', (ws, req) => {
  const token = new URLSearchParams(req.url.split('?')[1]).get('token');
  let username;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    username = decoded.username;
  } catch (err) {
    ws.close();
    return;
  }

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
        const partyId = Math.random().toString(36).substring(2, 8).toUpperCase();
        parties.set(partyId, {
          leader: username,
          players: new Set([ws]),
          map: 'map1',
          difficulty: 'easy',
          towers: [],
          gameMoney: 200,
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
          }));
          broadcastPartyPlayers(data.partyId);
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Party not found' }));
        }
        break;

      case 'leaveParty':
        if (ws.partyId && parties.has(ws.partyId)) {
          const party = parties.get(ws.partyId);
          party.players.delete(ws);
          if (party.players.size === 0) {
            parties.delete(ws.partyId);
          } else if (party.leader === username) {
            party.leader = Array.from(party.players)[0].username; // New leader
          }
          broadcastPartyPlayers(ws.partyId);
          ws.partyId = null;
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

server.listen(3000, () => console.log('Server running on port 3000'));