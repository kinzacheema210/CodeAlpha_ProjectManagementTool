const params = new URLSearchParams(window.location.search);
const projectId = params.get('id');
let project = null;
let tasks = [];

async function init() {
  await new Promise(r => setTimeout(r, 60)); // let nav.js connect socket / set currentUser
  await loadProject();
  await loadTasks();
}

async function loadProject() {
  const res = await fetch(`/api/projects/${projectId}`);
  if (!res.ok) {
    document.getElementById('projectHeader').innerHTML = '<p>Project not found or access denied.</p>';
    return;
  }
  project = await res.json();
  renderProjectHeader();
  populateAssigneeSelect();
}

function renderProjectHeader() {
  const isOwner = currentUser && project.owner.id === currentUser.id;
  document.getElementById('projectHeader').innerHTML = `
    <h2 style="margin:0 0 6px">${escapeHtml(project.name)}</h2>
    <p style="color:#5e6c84;margin:0 0 10px">${escapeHtml(project.description) || 'No description.'}</p>
    <div>Members: ${project.members.map(m => `<span class="member-chip">${escapeHtml(m.name)}</span>`).join('')}</div>
    ${isOwner ? `
      <form id="addMemberForm" style="margin-top:12px;display:flex;gap:8px;flex-direction:row;align-items:flex-start">
        <input type="email" id="memberEmail" placeholder="Invite by email" style="flex:1">
        <button type="submit" style="width:auto">Add Member</button>
      </form>
      <p id="memberMsg"></p>
    ` : ''}
  `;

  const memberForm = document.getElementById('addMemberForm');
  if (memberForm) {
    memberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('memberEmail').value;
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const msg = document.getElementById('memberMsg');
      if (res.ok) {
        project = await res.json();
        renderProjectHeader();
        populateAssigneeSelect();
        msg.className = 'msg';
        msg.textContent = 'Member added!';
      } else {
        const data = await res.json();
        msg.className = 'error';
        msg.textContent = data.error;
      }
    });
  }
}

function populateAssigneeSelect() {
  const select = document.getElementById('taskAssignee');
  select.innerHTML = '<option value="">Unassigned</option>' +
    project.members.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
}

async function loadTasks() {
  const res = await fetch(`/api/tasks/project/${projectId}`);
  if (!res.ok) return;
  tasks = await res.json();
  renderBoard();
}

function taskCardHtml(t) {
  return `
    <div class="task-card" data-id="${t.id}">
      <div class="title">${escapeHtml(t.title)}</div>
      ${t.assignee ? `<div class="assignee">👤 ${escapeHtml(t.assignee.name)}</div>` : '<div class="assignee">Unassigned</div>'}
      <div class="comment-count">💬 ${t.commentCount}</div>
    </div>
  `;
}

function renderBoard() {
  document.querySelectorAll('.column').forEach(col => {
    const status = col.dataset.status;
    const cardsContainer = col.querySelector('.cards');
    const columnTasks = tasks.filter(t => t.status === status);
    cardsContainer.innerHTML = columnTasks.map(taskCardHtml).join('') || '<p style="font-size:0.8rem;color:#5e6c84;padding:0 8px">No tasks</p>';
  });

  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', () => openTaskModal(card.dataset.id));
  });
}

document.getElementById('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('taskTitle').value;
  const description = document.getElementById('taskDesc').value;
  const assigneeId = document.getElementById('taskAssignee').value;
  const msg = document.getElementById('taskMsg');

  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, title, description, assigneeId })
  });

  if (res.ok) {
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDesc').value = '';
    msg.className = 'msg';
    msg.textContent = 'Task added!';
    setTimeout(() => msg.textContent = '', 1500);
    loadTasks();
  } else {
    const data = await res.json();
    msg.className = 'error';
    msg.textContent = data.error;
  }
});

// --- Task modal (details, status change, comments) ---

async function openTaskModal(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const backdrop = document.getElementById('taskModalBackdrop');
  const modal = document.getElementById('taskModal');
  backdrop.style.display = 'flex';

  modal.innerHTML = `
    <button class="modal-close" id="closeModal">✕</button>
    <h2>${escapeHtml(task.title)}</h2>
    <p style="color:#5e6c84">${escapeHtml(task.description) || 'No description.'}</p>
    <label>Assignee</label>
    <select id="modalAssignee">
      <option value="">Unassigned</option>
      ${project.members.map(m => `<option value="${m.id}" ${task.assignee && task.assignee.id === m.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')}
    </select>
    <div class="status-buttons">
      <button data-status="todo" class="${task.status === 'todo' ? 'active' : 'secondary'}">To Do</button>
      <button data-status="in_progress" class="${task.status === 'in_progress' ? 'active' : 'secondary'}">In Progress</button>
      <button data-status="done" class="${task.status === 'done' ? 'active' : 'secondary'}">Done</button>
    </div>
    <button class="danger" id="deleteTaskBtn">Delete Task</button>
    <hr style="margin:16px 0;border:none;border-top:1px solid #eee">
    <h3>Comments</h3>
    <div id="modalComments">Loading...</div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <input type="text" id="newComment" placeholder="Write a comment...">
      <button id="sendCommentBtn" style="width:auto">Send</button>
    </div>
  `;

  document.getElementById('closeModal').addEventListener('click', () => backdrop.style.display = 'none');

  document.getElementById('modalAssignee').addEventListener('change', async (e) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigneeId: e.target.value })
    });
    loadTasks();
  });

  modal.querySelectorAll('.status-buttons button').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: btn.dataset.status })
      });
      await loadTasks();
      openTaskModal(taskId); // refresh modal with new status highlighted
    });
  });

  document.getElementById('deleteTaskBtn').addEventListener('click', async () => {
    if (!confirm('Delete this task?')) return;
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    backdrop.style.display = 'none';
    loadTasks();
  });

  loadTaskComments(taskId);

  document.getElementById('sendCommentBtn').addEventListener('click', async () => {
    const input = document.getElementById('newComment');
    if (!input.value.trim()) return;
    await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input.value })
    });
    input.value = '';
    loadTaskComments(taskId);
    loadTasks();
  });
}

async function loadTaskComments(taskId) {
  const res = await fetch(`/api/tasks/${taskId}/comments`);
  const comments = await res.json();
  const container = document.getElementById('modalComments');
  if (!container) return; // modal might be closed already
  container.innerHTML = comments.length
    ? comments.map(c => `
        <div class="comment">
          <div class="name">${escapeHtml(c.author.name)}</div>
          <div>${escapeHtml(c.content)}</div>
        </div>
      `).join('')
    : '<p style="font-size:0.85rem;color:#5e6c84">No comments yet.</p>';
}

// --- Real-time updates via WebSocket ---
window.onRealtimeEvent = (event) => {
  if (event.projectId !== projectId) return; // ignore other boards
  // Simplest approach: just re-fetch tasks whenever something relevant changes
  if (['task_created', 'task_updated', 'task_deleted', 'comment_added'].includes(event.type)) {
    loadTasks();
    // If the comment modal for this task is open, refresh it too
    if (event.type === 'comment_added') {
      const openModal = document.getElementById('taskModalBackdrop');
      if (openModal && openModal.style.display === 'flex') {
        loadTaskComments(event.taskId);
      }
    }
  }
  if (event.type === 'member_added') {
    loadProject();
  }
};

init();
