const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Ensure Cloudinary is configured from environment variables
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'notes');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Check if Cloudinary credentials are present
const isCloudinaryActive = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let storage;

if (isCloudinaryActive) {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'student_hub_notes',
      resource_type: 'raw',
      public_id: (req, file) => {
        const cleanName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E4);
        return `${uniqueSuffix}-${cleanName}.pdf`;
      }
    }
  });
} else {
  // Local disk storage fallback
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
      const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E4);
      cb(null, `${uniqueSuffix}-${cleanName}`);
    }
  });
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.pdf' && file.mimetype !== 'application/pdf') {
    return cb(new Error('Only PDF documents are allowed for note uploads!'), false);
  }
  cb(null, true);
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;
