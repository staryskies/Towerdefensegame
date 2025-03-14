const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key"; // Use env var for security
const PORT = process.env.PORT || 3000; // Render assigns PORT dynamically

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files (html, js, etc.)

// In-memory storage (replace with a database in production)
const users = new Map(); // { username: { password, money, towers } }
const games = new Map(); // { map_difficulty: { players: [], towers: [], wave } }

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// HTTP Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "map.html"));
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  if (users.has(username)) return res.status(400).json({ error: "User already exists" });

  users.set(username, { password, money: 0, towers: ["basic"] });
  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
  res.json({ token });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  const user = users.get(username);
  if (!user || user.password !== password) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
  res.json({ token });
});

app.get("/user", authenticateToken, (req, res) => {
  const user = users.get(req.user.username);
  res.json({ money: user.money });
});

app.get("/towers", authenticateToken, (req, res) => {
  const user = users.get(req.user.username);
  res.json({ towers: user.towers });
});

app.post("/update-money", authenticateToken, (req, res) => {
  const { money } = req.body;
  if (typeof money !== "number") return res.status(400).json({ error: "Invalid money value" });
  const user = users.get(req.user.username);
  user.money = money;
  res.sendStatus(200);
});

// WebSocket Handling
wss.on("connection", (ws, req) => {
  const token = new URLSearchParams(req.url.split("?")[1]).get("token");
  let username;

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      ws.close(1008, "Invalid token");
      return;
    }
    username = user.username;
    ws.user = user;
  });

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
      return;
    }

    if (!data.map || !data.difficulty) return;

    const gameKey = `${data.map}_${data.difficulty}`;
    let game = games.get(gameKey);

    if (!game) {
      game = { players: [], towers: [], wave: 1 };
      games.set(gameKey, game);
    }

    switch (data.type) {
      case "join":
        if (!game.players.includes(username)) {
          game.players.push(username);
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "playerList", players: game.players }));
            }
          });
        }
        break;
      case "chat":
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "chat", sender: username, message: data.message }));
          }
        });
        break;
      case "placeTower":
        if (data.tower) {
          game.towers.push(data.tower);
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "placeTower", tower: data.tower }));
            }
          });
        }
        break;
      case "wave":
        if (data.wave > game.wave) {
          game.wave = data.wave;
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "wave", wave: data.wave }));
            }
          });
        }
        break;
      case "gameOver":
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "gameOver", won: data.won }));
          }
        });
        games.delete(gameKey);
        break;
      default:
        ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
    }
  });

  ws.on("close", () => {
    games.forEach((game, key) => {
      const index = game.players.indexOf(username);
      if (index !== -1) {
        game.players.splice(index, 1);
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "playerList", players: game.players }));
          }
        });
        if (game.players.length === 0) {
          games.delete(key);
        }
      }
    });
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle Uncaught Exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});