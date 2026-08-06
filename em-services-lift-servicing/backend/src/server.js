require('dotenv').config();

const dns = require('dns');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Some routers/ISPs proxy DNS in a way that breaks Node's SRV lookups
// (used by mongodb+srv:// URIs) even though the OS resolver works fine.
// Pointing Node directly at public DNS resolvers avoids that.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const uploadsRouter = require('./routes/uploads');
const liftRoutes = require('./routes/lifts/liftRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/uploads', uploadsRouter);
app.use('/api/lifts', liftRoutes);

// TODO: mount feature routers here as they're built, e.g.
// app.use('/api/scheduling', require('./routes/scheduling'));
// app.use('/api/inspections', require('./routes/inspections'));
// app.use('/api/defects', require('./routes/defects'));
// app.use('/api/rectifications', require('./routes/rectifications'));

// Catch-all error handler: converts thrown ApiErrors (via asyncHandler) into
// proper JSON responses instead of leaving the request hanging.
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  if (statusCode === 500) console.error(err);
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
