require('dotenv').config();

const dns = require('dns');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Some routers/ISPs proxy DNS in a way that breaks Node's SRV lookups
// (used by mongodb+srv:// URIs) even though the OS resolver works fine.
// Pointing Node directly at public DNS resolvers avoids that.
dns.setServers(['8.8.8.8', '1.1.1.1']);

// TODO: re-enable once AWS_REGION/AWS_ACCESS_KEY_ID/etc. are set in .env — the S3 client crashes on import without them
// const uploadsRouter = require('./routes/uploads');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// app.use('/api/uploads', uploadsRouter);

app.use('/api/scheduling', require('./routes/scheduling/schedulingRoutes'));

app.use('/api/lifts', require('./routes/lifts/liftRoutes'));

// TODO: mount remaining feature routers here as they're built, e.g.
// app.use('/api/inspections', require('./routes/inspections/inspectionsRoutes'));
// app.use('/api/defects', require('./routes/defects/defectsRoutes'));
// app.use('/api/rectifications', require('./routes/rectifications/rectificationsRoutes'));

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
