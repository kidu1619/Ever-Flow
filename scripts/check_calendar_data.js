const mongoose = require("mongoose");

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/eventflow");
  const events = await mongoose.connection.collection("events").find().toArray();
  console.log("EVENTS:", JSON.stringify(events.map(e => ({ id: e._id.toString(), name: e.name, orgId: e.organizationId?.toString() })), null, 2));
  
  const invoices = await mongoose.connection.collection("invoices").find().toArray();
  console.log("INVOICES:", JSON.stringify(invoices.map(i => ({ id: i._id.toString(), title: i.title, eventId: i.eventId?.toString(), orgId: i.organizationId?.toString(), dueDate: i.dueDate, status: i.status, total: i.totalAmount, payments: i.payments })), null, 2));
  
  const bookings = await mongoose.connection.collection("vendorbookings").find().toArray();
  console.log("VENDOR BOOKINGS:", JSON.stringify(bookings.map(b => ({ id: b._id.toString(), service: b.service, eventId: b.eventId?.toString(), startDate: b.startDate, agreedAmount: b.agreedAmount })), null, 2));

  const budgets = await mongoose.connection.collection("budgetitems").find().toArray();
  console.log("BUDGET ITEMS:", JSON.stringify(budgets.map(b => ({ id: b._id.toString(), title: b.title, eventId: b.eventId?.toString(), contractedCost: b.contractedCost, actualCost: b.actualCost })), null, 2));

  const expenses = await mongoose.connection.collection("expenses").find().toArray();
  console.log("EXPENSES:", JSON.stringify(expenses.map(x => ({ id: x._id.toString(), title: x.title, eventId: x.eventId?.toString(), amount: x.amount, date: x.date })), null, 2));

  await mongoose.disconnect();
}
run().catch(console.error);
