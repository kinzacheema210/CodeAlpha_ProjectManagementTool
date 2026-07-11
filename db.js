// db.js — simple file-based JSON "database".
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

function defaultData() {
  return {
    users: [],       // { id, name, email, passwordHash }
    projects: [],      // { id, name, description, ownerId, members: [userId], createdAt }
    tasks: [],           // { id, projectId, title, description, status, assigneeId, createdAt }
    comments: []           // { id, taskId, userId, content, createdAt }
  };
}

function ensureDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData(), null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = { readDb, writeDb };
