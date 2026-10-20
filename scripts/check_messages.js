const mongoose = require("mongoose");

async function check() {
  await mongoose.connect("mongodb://127.0.0.1:27017/eventflow");
  const count = await mongoose.connection.collection("messages").countDocuments();
  console.log("Total messages in DB:", count);
  const sample = await mongoose.connection.collection("messages").find().limit(5).toArray();
  console.log("Sample messages:", JSON.stringify(sample, null, 2));
  await mongoose.disconnect();
}

check();
