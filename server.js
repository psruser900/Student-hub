const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const db = require('./config/database');
const { authenticate, requireAuth, requireAdmin } = require('./middleware/authMiddleware');
const upload = require('./middleware/uploadMiddleware');

const authController = require('./controllers/authController');
const notesController = require('./controllers/notesController');
const adminController = require('./controllers/adminController');

const app = express();
const PORT = process.env.PORT || 3000;

// Standard Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Extract JWT user on all requests if token is present
app.use(authenticate);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// API Routes: Authentication
// -------------------------------------------------------------
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', requireAuth, authController.getProfile);
app.post('/api/auth/logout', authController.logout);

// -------------------------------------------------------------
// API Routes: Academic Hierarchy (Years, Semesters, Subjects)
// -------------------------------------------------------------
app.get('/api/years', notesController.getYears);
app.get('/api/semesters', notesController.getSemesters);
app.get('/api/subjects', notesController.getSubjects);
app.get('/api/subjects/:id', notesController.getSubjectDetails);

// -------------------------------------------------------------
// API Routes: Notes & PDF Viewer / Downloads (Protected)
// -------------------------------------------------------------
// PDF view supports token via header, cookie, or ?token= query param (handled in authMiddleware)
app.get('/api/notes/search', requireAuth, notesController.searchNotes);
app.get('/api/notes/:id/view', requireAuth, notesController.viewPdf);
app.get('/api/notes/:id/download', requireAuth, notesController.downloadPdf);

// -------------------------------------------------------------
// API Routes: Bookmarks (Student feature)
// -------------------------------------------------------------
app.get('/api/bookmarks', requireAuth, notesController.getBookmarks);
app.post('/api/bookmarks/:noteId', requireAuth, notesController.toggleBookmark);

// -------------------------------------------------------------
// API Routes: Admin & Faculty Controls
// -------------------------------------------------------------
app.get('/api/admin/stats', requireAuth, requireAdmin, adminController.getStats);
app.get('/api/admin/notes', requireAuth, requireAdmin, adminController.getAllNotes);
app.post('/api/admin/notes/upload', requireAuth, requireAdmin, upload.single('pdfFile'), adminController.uploadNote);
app.put('/api/admin/notes/:id', requireAuth, requireAdmin, upload.single('pdfFile'), adminController.updateNoteAndUnit);
app.post('/api/admin/subjects', requireAuth, requireAdmin, adminController.createSubject);
app.delete('/api/admin/subjects/:id', requireAuth, requireAdmin, adminController.deleteSubject);
app.delete('/api/admin/notes/:id', requireAuth, requireAdmin, adminController.deleteNote);

// -------------------------------------------------------------
// Client Page Routes
// -------------------------------------------------------------
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback for any unknown frontend route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.'
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🎓 College Student Notes Hub is live!`);
    console.log(`📡 Local URL:    http://localhost:${PORT}`);
    console.log(`📚 Year 1:       1st Sem & 2nd Sem Subjects Seeded`);
    console.log(`👤 Student Login: student@college.edu / Student@123`);
    console.log(`👑 Admin Login:   admin@college.edu / Admin@123`);
    console.log(`====================================================`);
  });
}

module.exports = app;
