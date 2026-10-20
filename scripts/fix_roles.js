const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function fix() {
  await mongoose.connect('mongodb://127.0.0.1:27017/eventflow');
  const db = mongoose.connection.db;
  
  const aureliaOrg = await db.collection('organizations').findOne({ slug: 'aurelia-events' });
  if (!aureliaOrg) {
    console.log('Aurelia org not found!');
    process.exit(1);
  }
  const orgId = aureliaOrg._id;

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // 1. Ensure external vendor user exists
  let vendorUser = await db.collection('users').findOne({ email: 'vendor@grandcrucatering.com' });
  if (!vendorUser) {
    const res = await db.collection('users').insertOne({
      name: 'Alex Rivera (Grand Cru Catering)',
      email: 'vendor@grandcrucatering.com',
      passwordHash,
      avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&auto=format&fit=crop&q=80',
      emailVerified: true,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vendorUser = { _id: res.insertedId, email: 'vendor@grandcrucatering.com' };
    console.log('Created vendorUser:', vendorUser._id);
  }

  // 2. Ensure client user exists
  let clientUser = await db.collection('users').findOne({ email: 'client@aureliaguest.com' });
  if (!clientUser) {
    const res = await db.collection('users').insertOne({
      name: 'Victoria Sterling (Host / Client)',
      email: 'client@aureliaguest.com',
      passwordHash,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
      emailVerified: true,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    clientUser = { _id: res.insertedId, email: 'client@aureliaguest.com' };
    console.log('Created clientUser:', clientUser._id);
  }

  // 3. Find other key users
  const marcus = await db.collection('users').findOne({ email: 'marcus@aureliaevents.com' });
  const sophia = await db.collection('users').findOne({ email: 'sophia@aureliaevents.com' });
  const julian = await db.collection('users').findOne({ email: 'julian@aureliaevents.com' });
  const claire = await db.collection('users').findOne({ email: 'claire@aureliaevents.com' });

  // Update Julian to VendorCoordinator
  if (julian) {
    await db.collection('organizationmemberships').updateOne(
      { organizationId: orgId, userId: julian._id },
      { $set: { role: 'VendorCoordinator', status: 'active' } }
    );
    console.log('Updated julian to VendorCoordinator');
  }

  // Set vendorUser membership to Vendor
  await db.collection('organizationmemberships').updateOne(
    { organizationId: orgId, userId: vendorUser._id },
    { $set: { role: 'Vendor', status: 'active' }, $setOnInsert: { joinedAt: new Date() } },
    { upsert: true }
  );
  console.log('Set vendor@grandcrucatering.com to Vendor');

  // Set clientUser membership to Client
  await db.collection('organizationmemberships').updateOne(
    { organizationId: orgId, userId: clientUser._id },
    { $set: { role: 'Client', status: 'active' }, $setOnInsert: { joinedAt: new Date() } },
    { upsert: true }
  );
  console.log('Set client@aureliaguest.com to Client');

  // Update Marcus to EventManager
  if (marcus) {
    await db.collection('organizationmemberships').updateOne(
      { organizationId: orgId, userId: marcus._id },
      { $set: { role: 'EventManager', status: 'active' } }
    );
    console.log('Updated marcus to EventManager');
  }

  // Update Sophia to FinanceManager
  if (sophia) {
    await db.collection('organizationmemberships').updateOne(
      { organizationId: orgId, userId: sophia._id },
      { $set: { role: 'FinanceManager', status: 'active' } }
    );
    console.log('Updated sophia to FinanceManager');
  }

  // Update Claire to active Staff
  if (claire) {
    await db.collection('organizationmemberships').updateOne(
      { organizationId: orgId, userId: claire._id },
      { $set: { role: 'Staff', status: 'active' } }
    );
    console.log('Updated claire to Staff (active)');
  }

  // Print all final memberships
  const finalM = await db.collection('organizationmemberships').find({ organizationId: orgId }).toArray();
  const allUsers = await db.collection('users').find({}).toArray();
  console.log('\nFINAL AURELIA MEMBERSHIPS:');
  for (const m of finalM) {
    const u = allUsers.find(u => u._id.toString() === m.userId.toString());
    console.log(u ? u.email : m.userId, '=>', m.role, '(' + m.status + ')');
  }

  process.exit(0);
}
fix().catch(err => {
  console.error(err);
  process.exit(1);
});
