const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/eventflow');
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  console.log('TOTAL USERS IN DB:', users.length);
  for (const u of users) {
    console.log(u.email, '|', u.name, '|', u.status, '| passwordHash length:', u.passwordHash?.length);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
