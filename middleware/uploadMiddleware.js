const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer to use Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'student_hub_notes',
    resource_type: 'raw', // 'raw' ensures PDFs are stored as original documents
    public_id: (req, file) => {
      const cleanName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9.-]/g, '_');
      return `${Date.now()}-${cleanName}`;
    }
  }
});

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
