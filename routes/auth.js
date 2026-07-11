const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { readDb, writeDb } = require('../db');

const router = express.Router();

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email };
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required.' });
  }
  const db = readDb();
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: uuid(), name, email, passwordHash };
  db.users.push(user);
  writeDb(db);
  req.session.userId = user.id;
  res.status(201).json(publicUser(user));
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });
  req.session.userId = user.id;
  res.json(publicUser(user));
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out.' }));
});

router.get('/me', (req, res) => {
  if (!req.session.userId) return res.json(null);
  const db = readDb();
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user) return res.json(null);
  res.json(publicUser(user));
});

module.exports = router;
module.exports.publicUser = publicUser;
