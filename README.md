# CodeAlpha_ProjectManagementTool

A collaborative project management tool (Trello/Asana-style) built for the **CodeAlpha Full Stack Development Internship — Task 3**.

## Features
- User registration & login (hashed passwords, sessions)
- Create group projects and invite members by email
- Kanban-style task board: **To Do / In Progress / Done**
- Assign tasks to project members
- Comment and communicate within each task
- **Bonus:** real-time updates via WebSockets — when anyone creates a task, moves it, or comments, everyone viewing the board sees it update live, no refresh needed

## Tech Stack
- **Frontend:** HTML, CSS, vanilla JavaScript
- **Backend:** Node.js + Express.js
- **Real-time:** `ws` (WebSocket) library, broadcasting task/comment/member events
- **Auth:** express-session + bcryptjs
- **Database:** JSON file storage (`data/db.json`), auto-created on first run

## Project Structure
```
CodeAlpha_ProjectManagementTool/
├── server.js            # Express + WebSocket server
├── broadcaster.js         # tiny WebSocket pub-sub helper
├── db.js
├── package.json
├── middleware/
│   └── requireAuth.js
├── routes/
│   ├── auth.js             # register / login / logout / me
│   ├── projects.js           # create/list projects, add members
│   └── tasks.js                # tasks, status changes, comments
├── data/
│   └── db.json                  # auto-generated
└── public/
    ├── index.html                 # redirects to dashboard/login
    ├── dashboard.html               # list + create projects
    ├── board.html                     # kanban board for one project
    ├── login.html
    ├── register.html
    ├── css/style.css
    └── js/ (nav.js, dashboard.js, board.js)
```

## How to Run Locally

1. Install Node.js (v18+): https://nodejs.org
2. Install dependencies:
   ```bash
   cd CodeAlpha_ProjectManagementTool
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open `http://localhost:3000`
5. Register 2 accounts (normal tab + incognito) to test inviting a member, assigning tasks to them, and watching real-time updates appear on both screens as you move tasks or add comments.

## How the real-time updates work
The server creates a WebSocket endpoint at `/ws`. Every connected browser tab subscribes to it. Whenever a task is created, moved, deleted, a comment is added, or a member is added to a project, the server broadcasts a small JSON event to all connected clients. Each board page listens for events matching its own `projectId` and refreshes automatically — so two people looking at the same board see changes appear live.

## API Endpoints

| Method | Endpoint                            | Description                     | Auth |
|--------|---------------------------------------|------------------------------------|------|
| POST   | /api/auth/register                    | Create account                       | No   |
| POST   | /api/auth/login                       | Log in                                | No   |
| POST   | /api/auth/logout                      | Log out                               | No   |
| GET    | /api/auth/me                          | Current user                          | No   |
| GET    | /api/projects                         | List my projects                      | Yes  |
| POST   | /api/projects                         | Create a project                      | Yes  |
| GET    | /api/projects/:id                     | View a project                        | Yes  |
| POST   | /api/projects/:id/members              | Add a member by email                  | Yes  |
| DELETE | /api/projects/:id                      | Delete a project (owner only)           | Yes  |
| GET    | /api/tasks/project/:projectId          | All tasks for a project (board data)     | Yes  |
| POST   | /api/tasks                             | Create a task                            | Yes  |
| PUT    | /api/tasks/:id                         | Update task (status/assignee/etc)         | Yes  |
| DELETE | /api/tasks/:id                          | Delete a task                              | Yes  |
| GET    | /api/tasks/:id/comments                  | List comments on a task                     | Yes  |
| POST   | /api/tasks/:id/comments                  | Add a comment                                | Yes  |

## Possible Improvements (Bonus)
- Drag-and-drop cards between columns instead of buttons
- Due dates and priority labels on tasks
- Email/browser notifications for assignments and mentions
- Swap JSON file storage for MongoDB/PostgreSQL

---
Built as part of the **CodeAlpha Full Stack Development Internship**, Task 3: Project Management Tool.
