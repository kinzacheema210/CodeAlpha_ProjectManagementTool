const express = require('express');
const { v4: uuid } = require('uuid');
const { readDb, writeDb } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { publicUser } = require('./auth');
const { broadcast } = require('../broadcaster');

const router = express.Router();
router.use(requireAuth);

function toPublicProject(db, project) {
  const owner = db.users.find(u => u.id === project.ownerId);
  const members = project.members
    .map(id => db.users.find(u => u.id === id))
    .filter(Boolean)
    .map(publicUser);
  const taskCount = db.tasks.filter(t => t.projectId === project.id).length;
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    owner: owner ? publicUser(owner) : null,
    members,
    taskCount,
    createdAt: project.createdAt
  };
}

// GET /api/projects - list projects I own or am a member of
router.get('/', (req, res) => {
  const db = readDb();
  const mine = db.projects.filter(p =>
    p.ownerId === req.session.userId || p.members.includes(req.session.userId)
  );
  res.json(mine.map(p => toPublicProject(db, p)));
});

// POST /api/projects - create a new project
router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required.' });

  const db = readDb();
  const project = {
    id: uuid(),
    name: name.trim(),
    description: description || '',
    ownerId: req.session.userId,
    members: [req.session.userId],
    createdAt: new Date().toISOString()
  };
  db.projects.push(project);
  writeDb(db);
  res.status(201).json(toPublicProject(db, project));
});

// GET /api/projects/:id - view one project (must be a member)
router.get('/:id', (req, res) => {
  const db = readDb();
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!project.members.includes(req.session.userId)) {
    return res.status(403).json({ error: 'You are not a member of this project.' });
  }
  res.json(toPublicProject(db, project));
});

// POST /api/projects/:id/members - add a member by email
router.post('/:id/members', (req, res) => {
  const { email } = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.ownerId !== req.session.userId) {
    return res.status(403).json({ error: 'Only the project owner can add members.' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user) return res.status(404).json({ error: 'No user found with that email.' });
  if (!project.members.includes(user.id)) project.members.push(user.id);

  writeDb(db);
  broadcast({ type: 'member_added', projectId: project.id });
  res.json(toPublicProject(db, project));
});

// DELETE /api/projects/:id - delete a project (owner only)
router.delete('/:id', (req, res) => {
  const db = readDb();
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.ownerId !== req.session.userId) {
    return res.status(403).json({ error: 'Only the project owner can delete this project.' });
  }
  const taskIds = db.tasks.filter(t => t.projectId === project.id).map(t => t.id);
  db.tasks = db.tasks.filter(t => t.projectId !== project.id);
  db.comments = db.comments.filter(c => !taskIds.includes(c.taskId));
  db.projects = db.projects.filter(p => p.id !== project.id);
  writeDb(db);
  res.json({ message: 'Project deleted.' });
});

module.exports = router;
