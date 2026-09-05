const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'notes');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory database cache
let dbData = {
  users: [],
  years: [
    { id: 1, name: "1st Year", description: "Freshman Year - Foundational Engineering & Sciences" },
    { id: 2, name: "2nd Year", description: "Sophomore Year - Core Department Engineering" },
    { id: 3, name: "3rd Year", description: "Junior Year - Advanced Specialization & Labs" },
    { id: 4, name: "4th Year", description: "Senior Year - Electives & Capstone Projects" }
  ],
  semesters: [
    { id: 1, yearId: 1, name: "Semester 1", code: "SEM-1" },
    { id: 2, yearId: 1, name: "Semester 2", code: "SEM-2" },
    { id: 3, yearId: 2, name: "Semester 3", code: "SEM-3" },
    { id: 4, yearId: 2, name: "Semester 4", code: "SEM-4" },
    { id: 5, yearId: 3, name: "Semester 5", code: "SEM-5" },
    { id: 6, yearId: 3, name: "Semester 6", code: "SEM-6" },
    { id: 7, yearId: 4, name: "Semester 7", code: "SEM-7" },
    { id: 8, yearId: 4, name: "Semester 8", code: "SEM-8" }
  ],
  subjects: [],
  units: [],
  notes: [],
  bookmarks: []
};

// Save DB state to disk atomically
function saveDatabase() {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(dbData, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[DB] Error persisting database:', err);
  }
}

// Minimal valid PDF generator for note samples
function generateSamplePdf(subjectCode, unitNumber, title, topics) {
  const content = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /Resources <<
    /Font <<
      /F1 4 0 R
      /F2 5 0 R
    >>
  >>
  /MediaBox [0 0 612 792]
  /Contents 6 0 R
>>
endobj
4 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica-Bold
>>
endobj
5 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj
6 0 obj
<<
  /Length 550
>>
stream
BT
/F1 22 Tf
50 740 Td
(${subjectCode} - UNIT ${unitNumber} NOTES) Tj
0 -30 Td
/F1 16 Tf
(${title}) Tj
0 -25 Td
/F2 11 Tf
(College Student Study Portal - Comprehensive Lecture & Revision Notes) Tj
0 -30 Td
/F1 13 Tf
(Key Topics Covered in this Unit:) Tj
0 -20 Td
/F2 11 Tf
(${topics.substring(0, 75)}) Tj
0 -18 Td
(${topics.length > 75 ? topics.substring(75, 150) : 'Standard university syllabus, derivation proofs, and solved examples.'}) Tj
0 -40 Td
/F1 12 Tf
(Summary & Key Concepts:) Tj
0 -20 Td
/F2 10 Tf
(1. Theoretical Foundations & Fundamental Definitions) Tj
0 -16 Td
(2. Step-by-Step Analytical Solutions and Problem Sets) Tj
0 -16 Td
(3. Formula Sheet & Fast Revision Guide for Midterm and Semester Exams) Tj
0 -16 Td
(4. Previous University Exam Questions with Model Answers) Tj
0 -45 Td
/F2 9 Tf
(Generated for Student Hub Portal | Keep learning and excel in your exams!) Tj
ET
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000346 00000 n 
0000000425 00000 n 
trailer
<<
  /Size 7
  /Root 1 0 R
>>
startxref
1028
%%EOF`;

  return Buffer.from(content, 'utf-8');
}

// Initial default subjects and unit data
const defaultSubjects = [
  // 1st Year - Sem 1
  {
    id: 1,
    yearId: 1,
    semesterId: 1,
    code: "MATH101",
    name: "Engineering Mathematics I",
    description: "Calculus, Linear Algebra, Matrices, Eigenvalues, and Multiple Integrals",
    icon: "fa-calculator",
    credits: 4,
    units: [
      { unitNumber: 1, unitTitle: "Matrices & Eigenvalues", topics: "Characteristic equation, Eigenvalues and Eigenvectors, Cayley-Hamilton Theorem, Diagonalization of matrices." },
      { unitNumber: 2, unitTitle: "Differential Calculus", topics: "Curvature in Cartesian & Polar coordinates, Evolutes and Involutes, Envelopes of family of curves." },
      { unitNumber: 3, unitTitle: "Functions of Several Variables", topics: "Partial derivatives, Total derivatives, Jacobians, Taylor series expansion, Maxima and Minima of two variables." },
      { unitNumber: 4, unitTitle: "Multiple Integrals", topics: "Double integrals, Change of order of integration, Area enclosed by plane curves, Triple integrals and Volume." },
      { unitNumber: 5, unitTitle: "Ordinary Differential Equations", topics: "Higher order linear ODEs with constant coefficients, Method of variation of parameters, Cauchy-Euler equations." }
    ]
  },
  {
    id: 2,
    yearId: 1,
    semesterId: 1,
    code: "PHY101",
    name: "Engineering Physics",
    description: "Wave Optics, Quantum Mechanics, Lasers, Fiber Optics, and Crystallography",
    icon: "fa-atom",
    credits: 3,
    units: [
      { unitNumber: 1, unitTitle: "Wave Optics & Interference", topics: "Air wedge, Newton rings experiment, Michelson interferometer, Anti-reflection coating." },
      { unitNumber: 2, unitTitle: "Lasers & Fiber Optics", topics: "Einstein coefficients, Nd:YAG Laser, Semiconductor laser, Optical fiber types, Acceptance angle and numerical aperture." },
      { unitNumber: 3, unitTitle: "Quantum Mechanics", topics: "de Broglie matter waves, Heisenberg uncertainty principle, Time-dependent and independent Schrodinger wave equations." },
      { unitNumber: 4, unitTitle: "Crystallography", topics: "Space lattice, Basis, Unit cell, Bravais lattices, Miller indices, X-ray diffraction, Bragg law." },
      { unitNumber: 5, unitTitle: "Semiconductors & Nanotechnology", topics: "Intrinsic and extrinsic semiconductors, Hall effect, Carbon nanotubes, Quantum dots, Synthesis and applications." }
    ]
  },
  {
    id: 3,
    yearId: 1,
    semesterId: 1,
    code: "CS101",
    name: "Programming for Problem Solving (C / Python)",
    description: "Algorithmic thinking, syntax, control flows, functions, pointers, and arrays",
    icon: "fa-code",
    credits: 3,
    units: [
      { unitNumber: 1, unitTitle: "Introduction to Problem Solving", topics: "Algorithms, Flowcharts, Pseudo-code, Compilation process, Primitive data types, Operators and Expressions." },
      { unitNumber: 2, unitTitle: "Control Statements & Loops", topics: "Branching statements (if-else, switch-case), Iteration (while, do-while, for loops), Nested loops, Break & Continue." },
      { unitNumber: 3, unitTitle: "Functions & Scope", topics: "Function prototype, Call by value vs Call by reference, Recursion, Storage classes and Variable scope." },
      { unitNumber: 4, unitTitle: "Arrays, Strings & Pointers", topics: "1D and 2D arrays, Character arrays, String library functions, Pointer arithmetic, Dynamic memory allocation (malloc, free)." },
      { unitNumber: 5, unitTitle: "Structures, Unions & Files", topics: "Structure definition, Nested structures, Unions vs Structures, File handling in C (fopen, fread, fwrite, fclose)." }
    ]
  },
  {
    id: 4,
    yearId: 1,
    semesterId: 1,
    code: "EE101",
    name: "Basic Electrical & Electronics Engineering",
    description: "DC/AC Circuits, Transformers, Diodes, Transistors, and Digital Gates",
    icon: "fa-bolt",
    credits: 3,
    units: [
      { unitNumber: 1, unitTitle: "DC Circuit Analysis", topics: "Ohm's Law, Kirchhoff's Laws (KCL, KVL), Mesh & Nodal analysis, Thevenin's, Norton's, and Superposition theorems." },
      { unitNumber: 2, unitTitle: "AC Circuits & Phasors", topics: "Sinusoidal waveforms, RMS and Average values, Phasor representation, Series RLC resonance, Power factor." },
      { unitNumber: 3, unitTitle: "Transformers & Electrical Machines", topics: "Single-phase transformer operation, EMF equation, Losses & Efficiency, Working principle of DC motors and 3-phase induction motor." },
      { unitNumber: 4, unitTitle: "Semiconductor Diodes & Power Supply", topics: "PN junction diode characteristics, Half wave and Full wave rectifiers, Zener diode voltage regulator." },
      { unitNumber: 5, unitTitle: "Bipolar Transistors & Digital Logic", topics: "BJT configurations (CE, CB, CC), Transistor as a switch, Operational amplifiers basics, Logic gates and truth tables." }
    ]
  },
  {
    id: 5,
    yearId: 1,
    semesterId: 1,
    code: "ME101",
    name: "Engineering Graphics & Design",
    description: "Engineering curves, Orthographic projections, Projections of solids, and CAD",
    icon: "fa-drafting-compass",
    credits: 3,
    units: [
      { unitNumber: 1, unitTitle: "Conic Sections & Scales", topics: "Ellipse, Parabola, Hyperbola, Involutes, Cycloids, Plain and Diagonal scales." },
      { unitNumber: 2, unitTitle: "Orthographic Projections", topics: "Principles of projection, First angle projection, Projection of points, Projection of straight lines in different quadrants." },
      { unitNumber: 3, unitTitle: "Projection of Regular Solids", topics: "Projections of Prisms, Pyramids, Cylinders, and Cones inclined to one reference plane." },
      { unitNumber: 4, unitTitle: "Sections & Development of Surfaces", topics: "Section planes, True shape of section, Development of lateral surfaces of prisms, cylinders, and cones." },
      { unitNumber: 5, unitTitle: "Isometric Projections & 2D CAD", topics: "Isometric scale, Isometric view of simple solids and truncated objects, Introduction to CAD software commands." }
    ]
  },

  // 1st Year - Sem 2
  {
    id: 6,
    yearId: 1,
    semesterId: 2,
    code: "MATH102",
    name: "Engineering Mathematics II",
    description: "Vector Calculus, Complex Variables, Laplace Transforms, and PDEs",
    icon: "fa-square-root-variable",
    credits: 4,
    units: [
      { unitNumber: 1, unitTitle: "Vector Differential Calculus", topics: "Gradient, Directional derivative, Divergence, Curl, Solenoidal and Irrotational vector fields." },
      { unitNumber: 2, unitTitle: "Vector Integral Calculus", topics: "Line, Surface, and Volume integrals, Green's theorem, Gauss Divergence theorem, Stokes theorem." },
      { unitNumber: 3, unitTitle: "Complex Variables & Analytic Functions", topics: "Cauchy-Riemann equations, Harmonic conjugate, Conformal mapping, Bilinear transformation." },
      { unitNumber: 4, unitTitle: "Complex Integration", topics: "Cauchy's integral theorem and formula, Taylor and Laurent series, Singularities, Residue theorem and real integrals." },
      { unitNumber: 5, unitTitle: "Laplace Transforms & Applications", topics: "Transforms of elementary functions, Shifting properties, Inverse Laplace transforms, Convolution theorem, Solving ODEs." }
    ]
  },
  {
    id: 7,
    yearId: 1,
    semesterId: 2,
    code: "CHY102",
    name: "Engineering Chemistry",
    description: "Water Technology, Electrochemistry, Corrosion, Polymers, and Batteries",
    icon: "fa-flask-vial",
    credits: 3,
    units: [
      { unitNumber: 1, unitTitle: "Water Technology & Treatment", topics: "Hardness of water, EDTA titration method, Boiler problems (scale, sludge, priming), Reverse Osmosis, Demineralization." },
      { unitNumber: 2, unitTitle: "Electrochemistry & Corrosion", topics: "Electrode potential, Nernst equation, Electrochemical corrosion mechanism, Galvanic corrosion, Cathodic protection." },
      { unitNumber: 3, unitTitle: "Polymers & Nanomaterials", topics: "Classification of polymers, Thermoplastics vs Thermosetting, Conducting polymers, Synthesis of nanomaterials." },
      { unitNumber: 4, unitTitle: "Fuels & Combustion", topics: "Calorific value (GCV, NCV), Bomb calorimeter, Proximate and Ultimate analysis of coal, Knocking and Octane rating." },
      { unitNumber: 5, unitTitle: "Energy Storage Devices", topics: "Primary vs Secondary cells, Lead-acid battery, Lithium-ion battery mechanism, Supercapacitors, Hydrogen fuel cells." }
    ]
  },
  {
    id: 8,
    yearId: 1,
    semesterId: 2,
    code: "CS102",
    name: "Data Structures & Algorithms",
    description: "Linked Lists, Stacks, Queues, Binary Trees, Graphs, Sorting & Searching",
    icon: "fa-diagram-project",
    credits: 4,
    units: [
      { unitNumber: 1, unitTitle: "Linear Data Structures & Arrays", topics: "Abstract Data Types (ADT), Asymptotic analysis (Big O), Dynamic arrays, Sparse matrices." },
      { unitNumber: 2, unitTitle: "Linked Lists", topics: "Singly linked lists, Doubly linked lists, Circular lists, Node insertion, deletion, reversal, Polynomial addition." },
      { unitNumber: 3, unitTitle: "Stacks & Queues", topics: "Stack ADT, Infix to Postfix conversion, Evaluation of postfix expressions, Linear Queue, Circular Queue, Deque." },
      { unitNumber: 4, unitTitle: "Trees & Binary Search Trees", topics: "Binary Tree representations, Tree traversals (Inorder, Preorder, Postorder), BST search, insert, delete, AVL Tree rotations." },
      { unitNumber: 5, unitTitle: "Graphs, Sorting & Searching", topics: "Graph representations (Adjacency matrix/list), BFS, DFS, Dijkstra algorithm, Quick sort, Merge sort, Binary search." }
    ]
  },
  {
    id: 9,
    yearId: 1,
    semesterId: 2,
    code: "EC102",
    name: "Digital Electronics & Logic Design",
    description: "Boolean Algebra, K-Maps, Combinational & Sequential Circuits, Counters",
    icon: "fa-microchip",
    credits: 3,
    units: [
      { unitNumber: 1, unitTitle: "Number Systems & Boolean Algebra", topics: "Binary, Octal, Hexadecimal conversions, 1s and 2s complements, Boolean theorems, De Morgan's laws, Karnaugh Maps." },
      { unitNumber: 2, unitTitle: "Combinational Logic Circuits", topics: "Half adder, Full adder, Parallel adder, Subtractors, Encoders, Priority encoders, Multiplexers (MUX) & Demultiplexers." },
      { unitNumber: 3, unitTitle: "Sequential Logic & Flip-Flops", topics: "Latches, SR Flip-Flop, JK Flip-Flop, D Flip-Flop, T Flip-Flop, Master-Slave configuration, Race-around condition." },
      { unitNumber: 4, unitTitle: "Registers & Counters", topics: "Shift registers (SISO, SIPO, PISO, PIPO), Asynchronous (Ripple) counters, Synchronous up/down counters, Ring counter." },
      { unitNumber: 5, unitTitle: "Semiconductor Memories", topics: "Memory organization, RAM (SRAM, DRAM), ROM (PROM, EPROM, EEPROM), Programmable Logic Devices (PLA, PAL)." }
    ]
  },
  {
    id: 10,
    yearId: 1,
    semesterId: 2,
    code: "HUM102",
    name: "Professional Communication & Soft Skills",
    description: "Technical Writing, Presentation Skills, Group Discussion, and Career Prep",
    icon: "fa-comments",
    credits: 2,
    units: [
      { unitNumber: 1, unitTitle: "Effective Communication Fundamentals", topics: "Communication process, Barriers to communication, Active listening, Verbal and Non-verbal communication." },
      { unitNumber: 2, unitTitle: "Grammar & Vocabulary Enhancement", topics: "Sentence structure, Subject-verb agreement, Common grammatical errors in technical contexts, Vocabulary in context." },
      { unitNumber: 3, unitTitle: "Professional & Technical Writing", topics: "Email etiquette, Technical report writing, Minutes of meeting, Resume and Curriculum Vitae (CV) creation." },
      { unitNumber: 4, unitTitle: "Presentation & Public Speaking Skills", topics: "Slide design, Delivery techniques, Managing stage fright, Audience engagement, Body language." },
      { unitNumber: 5, unitTitle: "Group Discussions & Interview Preparation", topics: "GD dynamics and roles, Dos and Don'ts in GD, HR and Technical interview etiquette, Answering behavioral questions." }
    ]
  }
];

// The single authorized administrator/faculty account.
// No other account is ever allowed to hold the 'admin' role - see
// enforceSingleAdmin() below, which is applied both on fresh installs
// and every time an existing database.json is loaded from disk.
const AUTHORIZED_ADMIN_EMAIL = 'dhonikabilin@gmail.com';
const AUTHORIZED_ADMIN_PASSWORD = 'Dhonik@2008';

// Guarantees that:
//  1. dhonikabilin@gmail.com exists, has role 'admin', and its password
//     hash matches AUTHORIZED_ADMIN_PASSWORD.
//  2. No other user account has the 'admin' role (any other admin account
//     found - e.g. left over from an older database.json - is demoted to
//     'student' rather than deleted, so no data is lost).
function enforceSingleAdmin() {
  let changed = false;

  const adminHash = bcrypt.hashSync(AUTHORIZED_ADMIN_PASSWORD, 10);
  let admin = dbData.users.find(u => u.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL);

  if (!admin) {
    admin = {
      id: dbData.users.length > 0 ? Math.max(...dbData.users.map(u => u.id)) + 1 : 1,
      name: "Administrator",
      email: AUTHORIZED_ADMIN_EMAIL,
      passwordHash: adminHash,
      rollNo: "ADMIN001",
      year: 1,
      department: "Academic Office",
      role: "admin",
      createdAt: new Date().toISOString()
    };
    dbData.users.push(admin);
    changed = true;
  } else {
    if (admin.role !== 'admin') { admin.role = 'admin'; changed = true; }
    if (!bcrypt.compareSync(AUTHORIZED_ADMIN_PASSWORD, admin.passwordHash || '')) {
      admin.passwordHash = adminHash;
      changed = true;
    }
  }

  for (const u of dbData.users) {
    if (u.role === 'admin' && u.email.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL) {
      u.role = 'student';
      changed = true;
    }
  }

  return changed;
}

// Initialize and seed database
function initDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      dbData = JSON.parse(data);
      console.log('[DB] Loaded existing database from disk.');
      if (enforceSingleAdmin()) {
        saveDatabase();
        console.log('[DB] Admin account reconciled to the authorized faculty account.');
      }
      return;
    } catch (e) {
      console.warn('[DB] Failed to parse existing database file, re-initializing...', e);
    }
  }

  console.log('[DB] Initializing new database with seed data...');

  // Default Admin & Student users
  const studentPasswordHash = bcrypt.hashSync('Student@123', 10);

  dbData.users = [
    {
      id: 2,
      name: "Alex Johnson",
      email: "student@college.edu",
      passwordHash: studentPasswordHash,
      rollNo: "CS2026-042",
      year: 1,
      department: "Computer Science & Engineering",
      role: "student",
      createdAt: new Date().toISOString()
    }
  ];
  enforceSingleAdmin();

  // Seed subjects, units, and sample PDFs
  let unitIdCounter = 1;
  let noteIdCounter = 1;
  dbData.subjects = [];
  dbData.units = [];
  dbData.notes = [];

  for (const s of defaultSubjects) {
    const subjectEntry = {
      id: s.id,
      yearId: s.yearId,
      semesterId: s.semesterId,
      code: s.code,
      name: s.name,
      description: s.description,
      icon: s.icon,
      credits: s.credits
    };
    dbData.subjects.push(subjectEntry);

    for (const u of s.units) {
      const currentUnitId = unitIdCounter++;
      const unitEntry = {
        id: currentUnitId,
        subjectId: s.id,
        unitNumber: u.unitNumber,
        unitTitle: u.unitTitle,
        topics: u.topics
      };
      dbData.units.push(unitEntry);

      // Generate a sample PDF note for every unit
      const pdfFileName = `${s.code}_Unit_${u.unitNumber}_Notes.pdf`;
      const pdfFilePath = path.join(UPLOADS_DIR, pdfFileName);
      const pdfBuffer = generateSamplePdf(s.code, u.unitNumber, u.unitTitle, u.topics);
      fs.writeFileSync(pdfFilePath, pdfBuffer);

      const noteEntry = {
        id: noteIdCounter++,
        unitId: currentUnitId,
        title: `${s.code} - Unit ${u.unitNumber}: ${u.unitTitle}`,
        description: `Complete lecture notes and exam formula sheet covering: ${u.topics}`,
        fileName: pdfFileName,
        fileSize: `${(pdfBuffer.length / 1024).toFixed(1)} KB`,
        uploadedBy: "Academic Department",
        downloadsCount: Math.floor(Math.random() * 80) + 20,
        viewsCount: Math.floor(Math.random() * 150) + 50,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 14 * 86400000)).toISOString()
      };
      dbData.notes.push(noteEntry);
    }
  }

  saveDatabase();
  console.log(`[DB] Database initialized with ${dbData.subjects.length} subjects, ${dbData.units.length} units, and ${dbData.notes.length} note PDFs!`);
}

// Database Operations
const db = {
  // Direct Data Access
  get users() { return dbData.users; },
  get years() { return dbData.years; },
  get semesters() { return dbData.semesters; },
  get subjects() { return dbData.subjects; },
  get units() { return dbData.units; },
  get notes() { return dbData.notes; },
  get bookmarks() { return dbData.bookmarks; },

  save: saveDatabase,

  // User queries
  findUserByEmail: (email) => {
    return dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  findUserById: (id) => {
    return dbData.users.find(u => u.id === Number(id));
  },
  createUser: (userData) => {
    const newUser = {
      id: dbData.users.length > 0 ? Math.max(...dbData.users.map(u => u.id)) + 1 : 1,
      ...userData,
      createdAt: new Date().toISOString()
    };
    dbData.users.push(newUser);
    saveDatabase();
    return newUser;
  },

  // Academic queries
  getSubjectsBySemester: (yearId, semesterId) => {
    return dbData.subjects.filter(s => 
      (!yearId || s.yearId === Number(yearId)) &&
      (!semesterId || s.semesterId === Number(semesterId))
    );
  },
  getSubjectById: (id) => {
    return dbData.subjects.find(s => s.id === Number(id));
  },
  getUnitsBySubjectId: (subjectId) => {
    return dbData.units
      .filter(u => u.subjectId === Number(subjectId))
      .sort((a, b) => a.unitNumber - b.unitNumber);
  },
  getNotesByUnitId: (unitId) => {
    return dbData.notes.filter(n => n.unitId === Number(unitId));
  },
  getNoteById: (id) => {
    return dbData.notes.find(n => n.id === Number(id));
  },
  createNote: (noteData) => {
    const newNote = {
      id: dbData.notes.length > 0 ? Math.max(...dbData.notes.map(n => n.id)) + 1 : 1,
      ...noteData,
      downloadsCount: 0,
      viewsCount: 0,
      createdAt: new Date().toISOString()
    };
    dbData.notes.push(newNote);
    saveDatabase();
    return newNote;
  },
  incrementNoteViews: (id) => {
    const note = dbData.notes.find(n => n.id === Number(id));
    if (note) {
      note.viewsCount = (note.viewsCount || 0) + 1;
      saveDatabase();
    }
  },
  incrementNoteDownloads: (id) => {
    const note = dbData.notes.find(n => n.id === Number(id));
    if (note) {
      note.downloadsCount = (note.downloadsCount || 0) + 1;
      saveDatabase();
    }
  },
  updateUnit: (id, data) => {
    const unit = dbData.units.find(u => u.id === Number(id));
    if (unit) {
      if (data.unitTitle) unit.unitTitle = data.unitTitle.trim();
      if (data.topics) unit.topics = data.topics.trim();
      saveDatabase();
      return unit;
    }
    return null;
  },
  updateNote: (id, data) => {
    const note = dbData.notes.find(n => n.id === Number(id));
    if (note) {
      if (data.title) note.title = data.title.trim();
      if (data.description !== undefined) note.description = data.description.trim();
      if (data.fileName) note.fileName = data.fileName;
      if (data.fileSize) note.fileSize = data.fileSize;
      saveDatabase();
      return note;
    }
    return null;
  },
  deleteSubject: (id) => {
    const subjectId = Number(id);
    const sIdx = dbData.subjects.findIndex(s => s.id === subjectId);
    if (sIdx === -1) return false;

    // Units for this subject
    const unitIds = dbData.units.filter(u => u.subjectId === subjectId).map(u => u.id);

    // Associated notes and PDFs
    const notesToDelete = dbData.notes.filter(n => unitIds.includes(n.unitId));
    for (const note of notesToDelete) {
      const filePath = path.join(UPLOADS_DIR, note.fileName);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    const noteIds = notesToDelete.map(n => n.id);

    // Remove from in-memory DB
    dbData.notes = dbData.notes.filter(n => !unitIds.includes(n.unitId));
    dbData.units = dbData.units.filter(u => u.subjectId !== subjectId);
    dbData.subjects.splice(sIdx, 1);
    dbData.bookmarks = dbData.bookmarks.filter(b => !noteIds.includes(b.noteId));

    saveDatabase();
    return true;
  },

  // Bookmark queries
  getBookmarksByUser: (userId) => {
    const userBookmarks = dbData.bookmarks.filter(b => b.userId === Number(userId));
    return userBookmarks.map(b => {
      const note = dbData.notes.find(n => n.id === b.noteId);
      if (!note) return null;
      const unit = dbData.units.find(u => u.id === note.unitId);
      const subject = unit ? dbData.subjects.find(s => s.id === unit.subjectId) : null;
      return {
        ...b,
        note,
        unit,
        subject
      };
    }).filter(Boolean);
  },
  isBookmarked: (userId, noteId) => {
    return dbData.bookmarks.some(b => b.userId === Number(userId) && b.noteId === Number(noteId));
  },
  toggleBookmark: (userId, noteId) => {
    const idx = dbData.bookmarks.findIndex(b => b.userId === Number(userId) && b.noteId === Number(noteId));
    if (idx >= 0) {
      dbData.bookmarks.splice(idx, 1);
      saveDatabase();
      return { bookmarked: false };
    } else {
      const newBookmark = {
        id: dbData.bookmarks.length > 0 ? Math.max(...dbData.bookmarks.map(b => b.id)) + 1 : 1,
        userId: Number(userId),
        noteId: Number(noteId),
        createdAt: new Date().toISOString()
      };
      dbData.bookmarks.push(newBookmark);
      saveDatabase();
      return { bookmarked: true, bookmark: newBookmark };
    }
  },

  // Global search
  searchNotes: (query) => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];

    const results = [];
    for (const note of dbData.notes) {
      const unit = dbData.units.find(u => u.id === note.unitId);
      const subject = unit ? dbData.subjects.find(s => s.id === unit.subjectId) : null;

      const matchesTitle = note.title.toLowerCase().includes(q);
      const matchesDesc = (note.description || '').toLowerCase().includes(q);
      const matchesUnit = unit && (unit.unitTitle.toLowerCase().includes(q) || unit.topics.toLowerCase().includes(q));
      const matchesSubject = subject && (subject.name.toLowerCase().includes(q) || subject.code.toLowerCase().includes(q));

      if (matchesTitle || matchesDesc || matchesUnit || matchesSubject) {
        results.push({
          note,
          unit,
          subject
        });
      }
    }
    return results;
  }
};

// Auto-run init
initDatabase();

module.exports = db;
