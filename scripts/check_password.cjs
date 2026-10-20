const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/eventflow');
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ email: 'olivia@aureliaevents.com' });
  console.log('USER:', user.email);
  const passwordsToTest = ['password123', 'Password123!', 'admin123', 'password', '123456', 'aurelia123'];
  for (const p of passwordsToTest) {
    const match = await bcrypt.compare(p, user.passwordHash);
    console.log('Testing password:', p, '=>', match);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
