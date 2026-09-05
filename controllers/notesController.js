const path = require('path');
const fs = require('fs');
const db = require('../config/database');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'notes');

// Get all academic years
function getYears(req, res) {
  return res.json({
    success: true,
    years: db.years
  });
}

// Get semesters, optionally filtered by year
function getSemesters(req, res) {
  const { yearId } = req.query;
  let semesters = db.semesters;
  if (yearId) {
    semesters = semesters.filter(s => s.yearId === Number(yearId));
  }
  return res.json({
    success: true,
    semesters
  });
}

// Get subjects, filtered by year and semester
function getSubjects(req, res) {
  const { year, semester } = req.query;
  const subjects = db.getSubjectsBySemester(year, semester);

  // Augment with unit counts and note counts
  const enrichedSubjects = subjects.map(s => {
    const units = db.getUnitsBySubjectId(s.id);
    const unitIds = units.map(u => u.id);
    const notesCount = db.notes.filter(n => unitIds.includes(n.unitId)).length;
    return {
      ...s,
      unitsCount: units.length,
      notesCount
    };
  });

  return res.json({
    success: true,
    subjects: enrichedSubjects
  });
}

// Get subject details with units, notes, and bookmark indicators
function getSubjectDetails(req, res) {
  const { id } = req.params;
  const subject = db.getSubjectById(id);

  if (!subject) {
    return res.status(404).json({
      success: false,
      message: 'Subject not found.'
    });
  }

  const units = db.getUnitsBySubjectId(subject.id);
  const userId = req.user ? req.user.id : null;

  const unitsWithNotes = units.map(unit => {
    const notes = db.getNotesByUnitId(unit.id).map(note => ({
      ...note,
      isBookmarked: userId ? db.isBookmarked(userId, note.id) : false
    }));

    return {
      ...unit,
      notes
    };
  });

  return res.json({
    success: true,
    subject: {
      ...subject,
      units: unitsWithNotes
    }
  });
}

// View PDF inline in browser
function viewPdf(req, res) {
  const { id } = req.params;
  const note = db.getNoteById(id);

  if (!note) {
    return res.status(404).json({
      success: false,
      message: 'Note not found.'
    });
  }

  const filePath = path.join(UPLOADS_DIR, note.fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'The requested PDF file is not available on the server.'
    });
  }

  db.incrementNoteViews(note.id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(note.fileName)}"`);
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}

// Download PDF as attachment
function downloadPdf(req, res) {
  const { id } = req.params;
  const note = db.getNoteById(id);

  if (!note) {
    return res.status(404).json({
      success: false,
      message: 'Note not found.'
    });
  }

  const filePath = path.join(UPLOADS_DIR, note.fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'The requested PDF file is not available on the server.'
    });
  }

  db.incrementNoteDownloads(note.id);

  res.download(filePath, note.fileName, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to download file.' });
    }
  });
}

// Global search across notes, units, subjects
function searchNotes(req, res) {
  const { q } = req.query;
  const results = db.searchNotes(q);

  const userId = req.user ? req.user.id : null;
  const enrichedResults = results.map(r => ({
    ...r,
    note: {
      ...r.note,
      isBookmarked: userId ? db.isBookmarked(userId, r.note.id) : false
    }
  }));

  return res.json({
    success: true,
    total: enrichedResults.length,
    results: enrichedResults
  });
}

// Toggle Bookmark
function toggleBookmark(req, res) {
  const { noteId } = req.params;
  const userId = req.user.id;

  const note = db.getNoteById(noteId);
  if (!note) {
    return res.status(404).json({
      success: false,
      message: 'Note not found.'
    });
  }

  const result = db.toggleBookmark(userId, noteId);
  return res.json({
    success: true,
    bookmarked: result.bookmarked,
    message: result.bookmarked ? 'Note saved to your bookmarks!' : 'Note removed from bookmarks.'
  });
}

// Get Bookmarks for logged in student
function getBookmarks(req, res) {
  const userId = req.user.id;
  const bookmarks = db.getBookmarksByUser(userId);

  return res.json({
    success: true,
    bookmarks
  });
}

module.exports = {
  getYears,
  getSemesters,
  getSubjects,
  getSubjectDetails,
  viewPdf,
  downloadPdf,
  searchNotes,
  toggleBookmark,
  getBookmarks
};
