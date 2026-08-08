const cloudinary = require('cloudinary').v2;

// cloudinary.config() just sets an in-memory config object - unlike the old S3Client,
// it doesn't touch the network, so importing this (and calling config() at module load)
// is safe even before CLOUDINARY_* env vars are set. routes/uploads.js checks for their
// presence itself and 503s if they're missing, rather than this module crashing on import.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
