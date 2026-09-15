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
