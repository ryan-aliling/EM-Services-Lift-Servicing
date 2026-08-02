require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const uploadsRouter = require('./routes/uploads');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/uploads', uploadsRouter);

// TODO: mount feature routers here as they're built, e.g.
// app.use('/api/lifts', require('./routes/lifts'));
// app.use('/api/scheduling', require('./routes/scheduling'));
// app.use('/api/inspections', require('./routes/inspections'));
// app.use('/api/defects', require('./routes/defects'));
// app.use('/api/rectifications', require('./routes/rectifications'));

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
