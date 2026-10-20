const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/eventflow');
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  for (const u of users) {
    console.log(u.email, '=>', u.passwordHash);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
