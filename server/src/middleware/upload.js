import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WebP images are allowed for profile photos.'));
    }
    cb(null, true);
  },
});

export const handleAvatarUpload = (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Profile photo exceeds the 5 MB file size limit.' });
      }
      return res.status(400).json({ message: err.message || 'Error uploading profile photo.' });
    }
    next();
  });
};

