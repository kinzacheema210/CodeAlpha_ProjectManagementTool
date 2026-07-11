let currentUser = null;
let socket = null;

async function loadNav() {
  const nav = document.getElementById('nav-auth');
  if (!nav) return;
  try {
    const res = await fetch('/api/auth/me');
    currentUser = await res.json();
    if (currentUser) {
      nav.innerHTML = `
        <a href="/dashboard.html">My Projects</a>
        <a href="#" id="logoutLink">Logout</a>
      `;
      document.getElementById('logoutLink').addEventListener('click', async (e) => {
        e.preventDefault();
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login.html';
      });
      connectSocket();
    } else {
      nav.innerHTML = `
        <a href="/login.html">Login</a>
        <a href="/register.html">Register</a>
      `;
    }
  } catch (err) {
    console.error('Failed to load nav', err);
  }
}
loadNav();

// Connect to the WebSocket server for real-time updates.
// Pages can define window.onRealtimeEvent(event) to react to messages.
function connectSocket() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  socket = new WebSocket(`${proto}://${window.location.host}/ws`);
  socket.addEventListener('message', (msg) => {
    try {
      const event = JSON.parse(msg.data);
      if (typeof window.onRealtimeEvent === 'function') {
        window.onRealtimeEvent(event);
      }
    } catch (err) {
      console.error('Bad WS message', err);
    }
  });
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
