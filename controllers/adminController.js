const path = require('path');
const fs = require('fs');
const db = require('../config/database');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'notes');

// Upload a new note PDF for a unit
function uploadNote(req, res) {
  try {
    const { unitId, title, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file was uploaded.'
      });
    }

    if (!unitId || !title) {
      // Remove uploaded file if validation failed
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Unit and Note Title are required.'
      });
    }

    const unit = db.units.find(u => u.id === Number(unitId));
    if (!unit) {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Selected unit does not exist.'
      });
    }

    const fileSizeFormatted = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`;

    const newNote = db.createNote({
      unitId: Number(unitId),
      title: title.trim(),
      description: (description || `Unit ${unit.unitNumber} study material and notes.`).trim(),
      fileName: file.filename,
      fileSize: fileSizeFormatted,
      uploadedBy: req.user ? req.user.name : 'Faculty Administrator'
    });

    return res.status(201).json({
      success: true,
      message: 'PDF Note uploaded successfully!',
      note: newNote
    });
  } catch (err) {
    console.error('[Admin] Upload note error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload note.'
    });
  }
}

// Add a new subject
function createSubject(req, res) {
  try {
    const { yearId, semesterId, code, name, description, icon, credits } = req.body;

    if (!yearId || !semesterId || !code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Year, Semester, Subject Code, and Name are required.'
      });
    }

    const newSubject = {
      id: db.subjects.length > 0 ? Math.max(...db.subjects.map(s => s.id)) + 1 : 1,
      yearId: Number(yearId),
      semesterId: Number(semesterId),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: (description || '').trim(),
      icon: (icon || 'fa-book').trim(),
      credits: Number(credits) || 3
    };

    db.subjects.push(newSubject);

    // Auto-create standard 5 units for this subject
    for (let i = 1; i <= 5; i++) {
      const newUnitId = db.units.length > 0 ? Math.max(...db.units.map(u => u.id)) + 1 : 1;
      db.units.push({
        id: newUnitId,
        subjectId: newSubject.id,
        unitNumber: i,
        unitTitle: `Unit ${i}: Core Principles & Syllabus`,
        topics: `Curriculum topics and examination reference material for Unit ${i}.`
      });
    }

    db.save();

    return res.status(201).json({
      success: true,
      message: `Subject ${newSubject.code} and 5 units created successfully.`,
      subject: newSubject
    });
  } catch (err) {
    console.error('[Admin] Create subject error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create subject.'
    });
  }
}

// Delete a note
function deleteNote(req, res) {
  try {
    const { id } = req.params;
    const noteIdx = db.notes.findIndex(n => n.id === Number(id));

    if (noteIdx === -1) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.'
      });
    }

    const note = db.notes[noteIdx];
    const filePath = path.join(UPLOADS_DIR, note.fileName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Could not delete physical file:', e.message);
      }
    }

    db.notes.splice(noteIdx, 1);
    db.save();

    return res.json({
      success: true,
      message: 'Note deleted successfully.'
    });
  } catch (err) {
    console.error('[Admin] Delete note error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete note.'
    });
  }
}

// Get Portal Statistics
function getStats(req, res) {
  const totalStudents = db.users.filter(u => u.role === 'student').length;
  const totalSubjects = db.subjects.length;
  const totalUnits = db.units.length;
  const totalNotes = db.notes.length;
  const totalDownloads = db.notes.reduce((sum, n) => sum + (n.downloadsCount || 0), 0);
  const totalViews = db.notes.reduce((sum, n) => sum + (n.viewsCount || 0), 0);

  return res.json({
    success: true,
    stats: {
      totalStudents,
      totalSubjects,
      totalUnits,
      totalNotes,
      totalDownloads,
      totalViews
    }
  });
}

// Get all notes with unit and subject metadata
function getAllNotes(req, res) {
  const notesList = db.notes.map(note => {
    const unit = db.units.find(u => u.id === note.unitId);
    const subject = unit ? db.subjects.find(s => s.id === unit.subjectId) : null;
    return {
      id: note.id,
      title: note.title,
      description: note.description,
      fileName: note.fileName,
      fileSize: note.fileSize,
      downloadsCount: note.downloadsCount || 0,
      viewsCount: note.viewsCount || 0,
      createdAt: note.createdAt,
      unitId: unit ? unit.id : null,
      unitNumber: unit ? unit.unitNumber : 1,
      unitTitle: unit ? unit.unitTitle : 'Unit',
      topics: unit ? unit.topics : '',
      subjectId: subject ? subject.id : null,
      subjectCode: subject ? subject.code : '',
      subjectName: subject ? subject.name : '',
      yearId: subject ? subject.yearId : 1,
      semesterId: subject ? subject.semesterId : 1
    };
  });

  return res.json({
    success: true,
    notes: notesList
  });
}

// Update Note and Unit details, optionally replacing the PDF file
function updateNoteAndUnit(req, res) {
  try {
    const { id } = req.params;
    const { noteTitle, noteDesc, unitTitle, topics } = req.body;
    const file = req.file;

    const note = db.notes.find(n => n.id === Number(id));
    if (!note) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    const unit = db.units.find(u => u.id === note.unitId);

    // Update Unit Title & Topics if provided
    if (unit && (unitTitle || topics)) {
      db.updateUnit(unit.id, {
        unitTitle: unitTitle || unit.unitTitle,
        topics: topics !== undefined ? topics : unit.topics
      });
    }

    // Update Note data
    const updateData = {};
    if (noteTitle) updateData.title = noteTitle;
    if (noteDesc !== undefined) updateData.description = noteDesc;

    // If a new replacement PDF was uploaded
    if (file) {
      // Remove old file if it exists and is different
      const oldFilePath = path.join(UPLOADS_DIR, note.fileName);
      if (fs.existsSync(oldFilePath) && note.fileName !== file.filename) {
        try { fs.unlinkSync(oldFilePath); } catch (e) {}
      }

      updateData.fileName = file.filename;
      updateData.fileSize = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;
    }

    const updatedNote = db.updateNote(note.id, updateData);

    return res.json({
      success: true,
      message: 'Lesson title, topics, and PDF updated successfully!',
      note: updatedNote,
      unit: unit ? db.units.find(u => u.id === unit.id) : null
    });
  } catch (err) {
    console.error('[Admin] Update note error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update note details.'
    });
  }
}

// Delete a subject and its associated units/notes
function deleteSubject(req, res) {
  try {
    const { id } = req.params;
    const success = db.deleteSubject(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Subject and all associated units/notes deleted successfully.'
    });
  } catch (err) {
    console.error('[Admin] Delete subject error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete subject.'
    });
  }
}

module.exports = {
  uploadNote,
  createSubject,
  deleteSubject,
  deleteNote,
  getStats,
  getAllNotes,
  updateNoteAndUnit
};
