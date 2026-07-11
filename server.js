const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const { register } = require('./broadcaster');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: 'codealpha-pm-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

app.use(express.static(path.join(__dirname, 'public')));

// Create an HTTP server manually so we can attach a WebSocket server to it
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  register(ws);
});

server.listen(PORT, () => {
  console.log(`CodeAlpha Project Management Tool running at http://localhost:${PORT}`);
});
