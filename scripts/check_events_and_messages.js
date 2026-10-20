const mongoose = require("mongoose");

async function check() {
  await mongoose.connect("mongodb://127.0.0.1:27017/eventflow");
  const msgs = await mongoose.connection.collection("messages").find({ eventId: new mongoose.Types.ObjectId("6ad4ad1af361dec5b0ee2a09") }).toArray();
  console.log("Messages for fenu and ken wedding:", JSON.stringify(msgs, null, 2));
  await mongoose.disconnect();
}

check();
