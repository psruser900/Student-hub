# 🎓 StudentHub - College Notes & Academic PDF Portal (Node.js)

A complete full-stack Node.js web application built specifically for college students to securely register, log in, and browse their academic notes organized hierarchically:

$$\text{Academic Year} \longrightarrow \text{Semester} \longrightarrow \text{Subject} \longrightarrow \text{Unit (1 to 5)} \longrightarrow \text{PDF Notes}$$

---

## 🌟 Key Features

- 🔐 **Student Authentication**:
  - Secure Student Registration (Full Name, College Email, Roll No / Student ID, Department, Year).
  - Secure Login with `bcryptjs` password encryption and JWT authentication.
  - Role-based permissions (Students & Faculty/Admins).
- 📚 **Academic Hierarchy**:
  - **1st Year - 1st Semester**:
    - `MATH101` - Engineering Mathematics I (Units 1 to 5)
    - `PHY101` - Engineering Physics (Units 1 to 5)
    - `CS101` - Programming for Problem Solving in C/Python (Units 1 to 5)
    - `EE101` - Basic Electrical & Electronics Engineering (Units 1 to 5)
    - `ME101` - Engineering Graphics & Design (Units 1 to 5)
  - **1st Year - 2nd Semester**:
    - `MATH102` - Engineering Mathematics II (Units 1 to 5)
    - `CHY102` - Engineering Chemistry (Units 1 to 5)
    - `CS102` - Data Structures & Algorithms (Units 1 to 5)
    - `EC102` - Digital Electronics & Logic Design (Units 1 to 5)
    - `HUM102` - Professional Communication & Soft Skills (Units 1 to 5)
  - Pre-seeded with 50 units and realistic PDF lecture notes!
- 📄 **In-Browser PDF Viewer**:
  - Embedded high-fidelity PDF viewer modal with Zoom, Fullscreen, Open in New Tab, and Direct Download.
- ⭐ **Exam Bookmarks / Starred Notes**:
  - Students can star units and notes to review them quickly right before tests and exams.
- 🔍 **Realtime Search**:
  - Search by subject name, subject code, unit title, or syllabus topics.
- 👑 **Faculty & Admin Portal (`/admin`)**:
  - Upload new PDF notes and attach them to any Year, Semester, Subject, and Unit.
  - Create new course subjects with automatic 5-unit generation.
  - View real-time portal statistics (Students, Notes, Downloads, Views).

---

## 🚀 Quick Start (Local Setup)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
Or for auto-reload during development:
```bash
npm run dev
```

### 3. Open in Browser
Visit: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Pre-Seeded Demo Accounts

You can log in immediately using the one-click demo button on the login page (student) or with the following credentials:

| Role | Email | Password |
|---|---|---|
| **Student** | `student@college.edu` | `Student@123` |
| **Faculty / Admin** | `dhonikabilin@gmail.com` | `Dhonik@2008` |

Faculty/Admin access is restricted to this single account only — no demo button is shown for it, and the server will not grant the `admin` role to any other account.

*(You can also register a new student account at any time using the "Register" tab!)*

---

## 🌐 How to Host Online (GitHub, Render, Netlify & Vercel)

> [!IMPORTANT]
> **Understanding Online Hosting for Node.js:**
> - **GitHub Pages** (`github.io`) only hosts *static* files (HTML/CSS/JS) and **cannot run a Node.js backend server or handle logins/database**.
> - Therefore, to host the Node.js backend, authentication, and PDF streaming for free, we use **Render.com** or **Vercel** connected directly to your GitHub repository!

### Option A: 1-Click Free Hosting on Render.com (Recommended)
Render provides free Node.js hosting with automatic HTTPS and GitHub integration:

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Student Hub"
   # Create a repository on github.com, then link it:
   git remote add origin https://github.com/YOUR_USERNAME/student-hub.git
   git branch -M main
   git push -u origin main
   ```
2. **Deploy on Render**:
   - Go to [https://render.com](https://render.com) and create a free account.
   - Click **New +** &rarr; **Web Service**.
   - Select your GitHub repository (`student-hub`).
   - Fill in the settings (Render will auto-detect from `render.yaml`):
     - **Name**: `student-hub`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
   - Click **Create Web Service**.
   - In 1–2 minutes, your website will be live with a free URL like:
     `https://student-hub.onrender.com`!

---

### Option B: Deploying on Vercel
A `vercel.json` configuration is already included in this repository.

1. Push your code to GitHub as shown above.
2. Go to [https://vercel.com](https://vercel.com) and log in with your GitHub account.
3. Click **Add New...** &rarr; **Project**, and import your `student-hub` repository.
4. Click **Deploy**. Vercel will build and deploy your application automatically!

---

### Option C: Deploying Frontend to Netlify
A `netlify.toml` file is included in this repository.
- Host the backend on Render (e.g. `https://student-hub.onrender.com`).
- Connect your GitHub repository to [https://netlify.com](https://netlify.com).
- Set publish directory to `public`.
- Uncomment the redirect rule in `netlify.toml` pointing `/api/*` to your Render backend!

---

## 📁 Project Structure

```
student-hub/
├── config/
│   └── database.js            # In-memory + JSON persistent database with auto-seeding
├── controllers/
│   ├── authController.js      # Student register, login, profile, JWT issuance
│   ├── notesController.js     # Subjects, units, PDF streaming, search, bookmarks
│   └── adminController.js     # Faculty upload and admin analytics
├── middleware/
│   ├── authMiddleware.js      # JWT & cookie verification middleware
│   └── uploadMiddleware.js    # Multer configuration for PDF validation
├── public/                    # Frontend client
│   ├── css/
│   │   └── style.css          # Responsive styling (modern academic UI)
│   ├── js/
│   │   ├── auth.js            # Login, register, demo credentials
│   │   ├── dashboard.js       # Dynamic Year -> Sem -> Subject -> Unit viewer & search
│   │   └── admin.js           # Faculty uploads and statistics
│   ├── index.html             # Landing & Student Login / Register page
│   ├── dashboard.html         # Main Student Portal with unitwise PDF viewer
│   └── admin.html             # Faculty upload & management portal
├── uploads/
│   └── notes/                 # Storage for generated and uploaded PDF notes
├── server.js                  # Main Express application entry point
├── render.yaml                # Render.com 1-click cloud deployment config
├── vercel.json                # Vercel serverless deployment config
├── netlify.toml               # Netlify configuration
├── package.json               # Dependencies and scripts
└── README.md                  # Complete documentation
```

---

## 🔒 Security Best Practices Implemented
- Passwords securely hashed with salted `bcryptjs`.
- JWT token authentication stored in `httpOnly` secure cookies & `localStorage`.
- Strict file upload filters allowing only verified `.pdf` MIME-types and file extensions.
- Role-based authorization guarding `/admin` endpoints.
