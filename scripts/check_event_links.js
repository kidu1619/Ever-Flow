const mongoose = require("mongoose");

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/eventflow");
  const eventId = new mongoose.Types.ObjectId("6ad4ad1af361dec5b0ee2a09");
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    const docs = await mongoose.connection.collection(col.name).find({
      $or: [
        { _id: eventId },
        { eventId: eventId },
        { linkedEventIds: eventId },
        { eventIds: eventId },
      ]
    }).toArray();
    if (docs.length > 0) {
      console.log(`Collection [${col.name}] has ${docs.length} docs:`, docs.map(d => ({ _id: d._id, title: d.title || d.name || d.service })));
    }
  }

  // Also check tasks without eventId or with string eventId
  const allTasks = await mongoose.connection.collection("tasks").find().toArray();
  console.log("Total tasks in DB:", allTasks.length, allTasks.map(t => ({ title: t.title, eventId: t.eventId })));

  await mongoose.disconnect();
}
run().catch(console.error);
