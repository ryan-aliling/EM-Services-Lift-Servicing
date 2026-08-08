require('dotenv').config();

const dns = require('dns');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Some routers/ISPs proxy DNS in a way that breaks Node's SRV lookups
// (used by mongodb+srv:// URIs) even though the OS resolver works fine.
// Pointing Node directly at public DNS resolvers avoids that.
dns.setServers(['8.8.8.8', '1.1.1.1']);

// File uploads (photos, e-signatures, etc.) go through Cloudinary's signed-upload flow -
// this router only ever hands out a short-lived signature (see routes/uploads.js), never
// the API secret itself, and 503s until CLOUDINARY_* env vars are configured. Needed here
// because Rectifications (photos + e-signature) and Scheduling both upload through it.
const uploadsRouter = require('./routes/uploads');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/uploads', uploadsRouter);

app.use('/api/scheduling', require('./routes/scheduling/schedulingRoutes'));

app.use('/api/lifts', require('./routes/lifts/liftRoutes'));

app.use('/api/inspections', require('./routes/inspections/inspectionsRoutes'));

app.use('/api/defects', require('./routes/defects/defectsRoutes'));

app.use('/api/rectifications', require('./routes/rectifications/rectificationsRoutes'));

// Added while building the inspections module: nothing in the repo was catching errors
// thrown/forwarded by asyncHandler (ApiError.badRequest/notFound etc.) before this, so they
// were falling through to Express's default handler and coming back as HTML 500s instead of
// the { success: false, message } JSON the frontend expects. This applies to every feature's
// routes, not just inspections - safe to keep as-is when other modules add their own routers.
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) console.error(err);
  res.status(statusCode).json({ success: false, message: err.message || 'Internal server error' });
});

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;