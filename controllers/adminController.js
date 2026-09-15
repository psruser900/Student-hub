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
      if (file && file.path && !file.path.startsWith('http') && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Unit and Note Title are required.'
      });
    }
    const unit = db.units.find(u => u.id === Number(unitId));
    if (!unit) {
      if (file && file.path && !file.path.startsWith('http') && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Selected unit does not exist.'
