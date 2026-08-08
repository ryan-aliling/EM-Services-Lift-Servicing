const express = require('express');
const cloudinary = require('../utils/cloudinary');

const router = express.Router();

// Signed-upload flow: the frontend never sees CLOUDINARY_API_SECRET - it only gets a
// short-lived signature computed with it, then uploads the file bytes straight to
// Cloudinary itself (see useFileUpload.js), so file bytes never pass through our server.
router.post('/signature', (req, res) => {
  const { folder } = req.body || {};

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(503).json({ error: 'File uploads are not configured on this server yet' });
  }

  try {
    const timestamp = Math.round(Date.now() / 1000);
    // Every param included here must be signed AND sent back to the client, which must
    // in turn send that exact same set of params on the actual upload request - Cloudinary
    // recomputes the signature server-side from whatever params arrive with the upload
    // and rejects the request if it doesn't match.
    const paramsToSign = folder ? { timestamp, folder } : { timestamp };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

    res.json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder: folder || undefined,
    });
  } catch (err) {
    console.error('Cloudinary signature error:', err);
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

module.exports = router;
