async function loadProjects() {
  const container = document.getElementById('projectList');
  const res = await fetch('/api/projects');
  if (res.status === 401) {
    container.innerHTML = '<p>Please <a href="/login.html">login</a> to see your projects.</p>';
    return;
  }
  const projects = await res.json();
  if (projects.length === 0) {
    container.innerHTML = '<p>No projects yet. Create one above to get started!</p>';
    return;
  }
  container.innerHTML = projects.map(p => `
    <div class="project-row">
      <div>
        <h3><a href="/board.html?id=${p.id}" style="color:inherit;text-decoration:none">${escapeHtml(p.name)}</a></h3>
        <div class="project-meta">${p.taskCount} task(s) · ${p.members.length} member(s) · Owner: ${p.owner.name}</div>
      </div>
      <a class="btn" href="/board.html?id=${p.id}">Open Board</a>
    </div>
  `).join('');
}

document.getElementById('createForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('pName').value;
  const description = document.getElementById('pDesc').value;
  const msg = document.getElementById('createMsg');

  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description })
  });

  if (res.ok) {
    const project = await res.json();
    window.location.href = `/board.html?id=${project.id}`;
  } else {
    const data = await res.json();
    msg.className = 'error';
    msg.textContent = data.error;
  }
});

loadProjects();
