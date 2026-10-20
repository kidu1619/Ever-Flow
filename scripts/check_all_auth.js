const mongoose = require("mongoose");

async function checkAll() {
  await mongoose.connect("mongodb://127.0.0.1:27017/eventflow");
  const users = await mongoose.connection.collection("users").find().toArray();
  const memberships = await mongoose.connection.collection("organizationmemberships").find().toArray();
  const events = await mongoose.connection.collection("events").find().toArray();
  const invoices = await mongoose.connection.collection("invoices").find().toArray();

  console.log("=== MEMBERSHIPS ===");
  memberships.forEach(m => console.log(`User ${m.userId} in Org ${m.organizationId} role ${m.role}`));

  console.log("\n=== EVENTS ===");
  events.forEach(e => console.log(`Event [${e.name}] id: ${e._id} org: ${e.organizationId}`));

  console.log("\n=== INVOICES ===");
  invoices.forEach(i => console.log(`Invoice [${i.title}] id: ${i._id} org: ${i.organizationId} event: ${i.eventId} status: ${i.status}`));

  await mongoose.disconnect();
}
checkAll().catch(console.error);
