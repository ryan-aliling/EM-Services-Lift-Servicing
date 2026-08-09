// Runs utils/cascadeDelete.js's cleanupOrphans() repair pass against the real DB. Safe to
// re-run any time - only touches records left dangling by a parent removed outside the
// normal cascading-delete handlers. Usage: npm run cleanup:orphans
require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const { cleanupOrphans } = require('../src/utils/cascadeDelete');

mongoose
  .connect(process.env.DATABASE_URL)
  .then(async () => {
    console.log(await cleanupOrphans());
    await mongoose.disconnect();
  })
  .catch((err) => {
    console.error('Cleanup error:', err);
    process.exit(1);
  });
