const express = require('express');
const { v4: uuid } = require('uuid');
const { readDb, writeDb } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { publicUser } = require('./auth');
const { broadcast } = require('../broadcaster');

const router = express.Router();
router.use(requireAuth);

const STATUSES = ['todo', 'in_progress', 'done'];

function toPublicTask(db, task) {
  const assignee = task.assigneeId ? db.users.find(u => u.id === task.assigneeId) : null;
  const commentCount = db.comments.filter(c => c.taskId === task.id).length;
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    assignee: assignee ? publicUser(assignee) : null,
    commentCount,
    createdAt: task.createdAt
  };
}

function checkMembership(db, projectId, userId) {
  const project = db.projects.find(p => p.id === projectId);
  if (!project) return null;
  if (!project.members.includes(userId)) return false;
  return project;
}

// GET /api/tasks/project/:projectId - all tasks for a project (kanban board data)
router.get('/project/:projectId', (req, res) => {
  const db = readDb();
  const membership = checkMembership(db, req.params.projectId, req.session.userId);
  if (membership === null) return res.status(404).json({ error: 'Project not found.' });
  if (membership === false) return res.status(403).json({ error: 'Not a member of this project.' });

  const tasks = db.tasks
    .filter(t => t.projectId === req.params.projectId)
    .map(t => toPublicTask(db, t));
  res.json(tasks);
});

// POST /api/tasks - create a task
router.post('/', (req, res) => {
  const { projectId, title, description, assigneeId } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Task title is required.' });

  const db = readDb();
  const membership = checkMembership(db, projectId, req.session.userId);
  if (membership === null) return res.status(404).json({ error: 'Project not found.' });
  if (membership === false) return res.status(403).json({ error: 'Not a member of this project.' });

  const task = {
    id: uuid(),
    projectId,
    title: title.trim(),
    description: description || '',
    status: 'todo',
    assigneeId: assigneeId || null,
    createdAt: new Date().toISOString()
  };
  db.tasks.push(task);
  writeDb(db);

  broadcast({ type: 'task_created', projectId, task: toPublicTask(db, task) });
  res.status(201).json(toPublicTask(db, task));
});

// PUT /api/tasks/:id - update task (title/description/status/assignee)
router.put('/:id', (req, res) => {
  const db = readDb();
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const membership = checkMembership(db, task.projectId, req.session.userId);
  if (membership === false) return res.status(403).json({ error: 'Not a member of this project.' });

  const { title, description, status, assigneeId } = req.body;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (status !== undefined && STATUSES.includes(status)) task.status = status;
  if (assigneeId !== undefined) task.assigneeId = assigneeId || null;

  writeDb(db);
  broadcast({ type: 'task_updated', projectId: task.projectId, task: toPublicTask(db, task) });
  res.json(toPublicTask(db, task));
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const db = readDb();
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const membership = checkMembership(db, task.projectId, req.session.userId);
  if (membership === false) return res.status(403).json({ error: 'Not a member of this project.' });

  db.tasks = db.tasks.filter(t => t.id !== req.params.id);
  db.comments = db.comments.filter(c => c.taskId !== req.params.id);
  writeDb(db);

  broadcast({ type: 'task_deleted', projectId: task.projectId, taskId: task.id });
  res.json({ message: 'Task deleted.' });
});

// --- Comments ---

// GET /api/tasks/:id/comments
router.get('/:id/comments', (req, res) => {
  const db = readDb();
  const comments = db.comments
    .filter(c => c.taskId === req.params.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(c => {
      const author = db.users.find(u => u.id === c.userId);
      return {
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        author: author ? publicUser(author) : null
      };
    });
  res.json(comments);
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });

  const db = readDb();
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const membership = checkMembership(db, task.projectId, req.session.userId);
  if (membership === false) return res.status(403).json({ error: 'Not a member of this project.' });

  const comment = {
    id: uuid(),
    taskId: req.params.id,
    userId: req.session.userId,
    content: content.trim(),
    createdAt: new Date().toISOString()
  };
  db.comments.push(comment);
  writeDb(db);

  const author = db.users.find(u => u.id === comment.userId);
  const publicComment = { id: comment.id, content: comment.content, createdAt: comment.createdAt, author: publicUser(author) };

  broadcast({ type: 'comment_added', projectId: task.projectId, taskId: task.id, comment: publicComment });
  res.status(201).json(publicComment);
});

module.exports = router;
