const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post('/api/upload', upload.single('upload'), (req, res) => {
    console.log('Uploaded file info:', req.file);
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const tempPath = req.file.path;
  const targetPath = path.join(__dirname, '../uploads/', req.file.originalname);

  fs.rename(tempPath, targetPath, err => {
    if (err) return res.status(500).json({ error: 'Upload failed' });

    res.status(200).json({
  url: `http://localhost:5000/uploads/${req.file.originalname}`,
});

  });
});

module.exports = router;
