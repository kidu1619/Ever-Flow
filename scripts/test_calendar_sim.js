const mongoose = require("mongoose");

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/eventflow");
  const orgId = new mongoose.Types.ObjectId("6ad3530b614abbc31b504f2c");
  const eventId = "6ad4ad1af361dec5b0ee2a09";

  const events = await mongoose.connection.collection("events").find({
    organizationId: orgId,
    deletedAt: null,
    _id: new mongoose.Types.ObjectId(eventId)
  }).toArray();

  const tasks = await mongoose.connection.collection("tasks").find({
    organizationId: orgId
  }).toArray();

  const bookings = await mongoose.connection.collection("vendorbookings").find({
    organizationId: orgId,
    status: { $ne: "cancelled" }
  }).toArray();

  const invoices = await mongoose.connection.collection("invoices").find({
    organizationId: orgId
  }).toArray();

  console.log("Events count:", events.length);
  console.log("Tasks total:", tasks.length);
  console.log("Bookings total:", bookings.length);
  console.log("Invoices total:", invoices.length);

  const thisEventTasks = tasks.filter(t => t.eventId?.toString() === eventId);
  console.log("This event tasks:", thisEventTasks.length, "with dueDate:", thisEventTasks.filter(t => t.dueDate).length);
  thisEventTasks.forEach(t => console.log(" - Task:", t.title, "dueDate:", t.dueDate));

  const thisEventBookings = bookings.filter(b => b.eventId?.toString() === eventId);
  console.log("This event bookings:", thisEventBookings.length);
  thisEventBookings.forEach(b => console.log(" - Booking:", b.service, "startDate:", b.startDate, "endDate:", b.endDate, "agreedAmount:", b.agreedAmount));

  const thisEventInvoices = invoices.filter(i => i.eventId?.toString() === eventId);
  console.log("This event invoices:", thisEventInvoices.length);

  await mongoose.disconnect();
}
run().catch(console.error);
