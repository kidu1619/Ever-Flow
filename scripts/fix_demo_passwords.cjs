const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/eventflow');
  const db = mongoose.connection.db;
  
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password123', salt);
  
  const demoEmails = [
    'olivia@aureliaevents.com',
    'marcus@aureliaevents.com',
    'sophia@aureliaevents.com',
    'julian@aureliaevents.com',
    'claire@aureliaevents.com',
    'vendor@grandcrucatering.com',
    'client@aureliaguest.com',
    'client@aureliaevents.com',
    'superadmin@yenegeacademy.com',
    'superadmin@everflow.io'
  ];
  
  const res = await db.collection('users').updateMany(
    { email: { $in: demoEmails } },
    { $set: { passwordHash: hash } }
  );
  
  console.log('Updated demo users passwordHash:', res.modifiedCount);
  
  // Verify Olivia's password
  const olivia = await db.collection('users').findOne({ email: 'olivia@aureliaevents.com' });
  const check = await bcrypt.compare('password123', olivia.passwordHash);
  console.log('Verification for olivia password123:', check);
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
