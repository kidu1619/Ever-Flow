const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/eventflow');
  const db = mongoose.connection.db;

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const aureliaOrg = await db.collection('organizations').findOne({ slug: 'aurelia-events' });
  const orgId = aureliaOrg ? aureliaOrg._id : null;

  // 1. Ensure Yenege Academy user exists
  let yenegeUser = await db.collection('users').findOne({ email: 'superadmin@yenegeacademy.com' });
  if (!yenegeUser) {
    const res = await db.collection('users').insertOne({
      name: 'Yenege Academy (SaaS Platform Owner)',
      email: 'superadmin@yenegeacademy.com',
      passwordHash,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      emailVerified: true,
      status: 'active',
      isPlatformAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    yenegeUser = { _id: res.insertedId, email: 'superadmin@yenegeacademy.com' };
    console.log('Created Yenege Academy platform admin:', yenegeUser._id);
  } else {
    await db.collection('users').updateOne(
      { _id: yenegeUser._id },
      { $set: { isPlatformAdmin: true, name: 'Yenege Academy (SaaS Platform Owner)', passwordHash } }
    );
    console.log('Updated existing Yenege Academy user to isPlatformAdmin: true');
  }

  // 2. Also ensure superadmin@everflow.io isPlatformAdmin: true
  await db.collection('users').updateOne(
    { email: 'superadmin@everflow.io' },
    { $set: { isPlatformAdmin: true, name: 'Yenege Academy Admin', passwordHash } },
    { upsert: false }
  );

  // 3. Yenege Academy operates as SaaS Platform Master Authority (no tenant ownership)
  if (yenegeUser) {
    await db.collection('organizationmemberships').deleteMany({ userId: yenegeUser._id });
    console.log('Confirmed Yenege Academy as pure Platform Master Authority');
  }

  console.log('Done!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
