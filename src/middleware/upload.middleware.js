const multer = require('multer');
const path = require('path');
const ApiError = require('../utils/ApiError');

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function makeStorage(folder) {
  return multer.diskStorage({
    destination: path.join(process.cwd(), 'uploads', folder),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
}

function fileFilter(_req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
  cb(ApiError.badRequest('Only JPEG, PNG, WebP and PDF files are allowed'));
}

const uploadProfile = multer({ storage: makeStorage('profiles'), fileFilter, limits: { fileSize: MAX_SIZE } });
const uploadDocument = multer({ storage: makeStorage('documents'), fileFilter, limits: { fileSize: MAX_SIZE } });
const uploadChat = multer({ storage: makeStorage('chat'), fileFilter, limits: { fileSize: MAX_SIZE } });

module.exports = { uploadProfile, uploadDocument, uploadChat };
