const mongoose = require("mongoose");

async function check() {
  await mongoose.connect("mongodb://127.0.0.1:27017/eventflow");
  const clients = await mongoose.connection.collection("clients").find().toArray();
  console.log("Clients in DB:", clients.map(c => ({ id: c._id, name: c.name, email: c.email, linkedEventIds: c.linkedEventIds })));
  await mongoose.disconnect();
}

check();
