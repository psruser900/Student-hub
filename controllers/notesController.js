// View PDF inline in browser
function viewPdf(req, res) {
  const { id } = req.params;
  const note = db.getNoteById(id);

  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found.' });
  }

  db.incrementNoteViews(note.id);

  // If the file is stored in Cloudinary, redirect to it
  if (note.fileUrl && note.fileUrl.startsWith('http')) {
    return res.redirect(note.fileUrl);
  }

  // Fallback for pre-seeded local sample files
  const filePath = path.join(UPLOADS_DIR, note.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'The requested PDF file is not available.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(note.fileName)}"`);
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}

// Download PDF as attachment
function downloadPdf(req, res) {
  const { id } = req.params;
  const note = db.getNoteById(id);

  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found.' });
  }

  db.incrementNoteDownloads(note.id);

  // If the file is stored in Cloudinary, redirect to download
  if (note.fileUrl && note.fileUrl.startsWith('http')) {
    return res.redirect(note.fileUrl);
  }

  // Fallback for local files
  const filePath = path.join(UPLOADS_DIR, note.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'The requested PDF file is not available.' });
  }

  return res.download(filePath, note.fileName);
}
