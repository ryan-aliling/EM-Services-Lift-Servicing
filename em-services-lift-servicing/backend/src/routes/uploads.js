const express = require('express');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const router = express.Router();

// Built lazily (on first request) instead of at module-load time, so a
// missing AWS_REGION only breaks this endpoint instead of crashing the
// whole server on startup.
let s3;
function getS3Client() {
  if (!s3) s3 = new S3Client({ region: process.env.AWS_REGION });
  return s3;
}

router.post('/presign', async (req, res) => {
  const { fileName, fileType } = req.body;

  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'fileName and fileType are required' });
  }

  if (!process.env.AWS_REGION || !process.env.AWS_S3_BUCKET) {
    return res.status(503).json({ error: 'File uploads are not configured on this server yet' });
  }

  try {
    const key = `${crypto.randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 60 });
    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    res.json({ uploadUrl, fileUrl, key });
  } catch (err) {
    console.error('Presign error:', err);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

module.exports = router;
