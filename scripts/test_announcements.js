const fetch = globalThis.fetch;

async function test() {
  // 1. Login as Marcus (Event Manager)
  const marcusRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "marcus@aureliaevents.com", password: "password123" })
  });
  const marcusCookies = marcusRes.headers.get("set-cookie");

  // 2. Broadcast from Event Manager ➔ to EVERYONE
  console.log("=== 1. Broadcast from Event Manager to Everyone ===");
  const bc1 = await fetch("http://localhost:3000/api/announcements", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: marcusCookies },
    body: JSON.stringify({
      title: "Stage West Acoustic Soundcheck Shift",
      message: "Stage 1 acoustic soundcheck is shifted to 14:00. Catering and floor crew clear main aisle.",
      priority: "urgent",
      fromRole: "EventManager",
      fromName: "Marcus Vance",
      targetRole: "all"
    })
  });
  const bc1Data = await bc1.json();
  console.log("Broadcast 1 Status:", bc1.status, bc1Data.message);

  // 3. Broadcast from Vendor Coordinator ➔ to VENDORS ONLY
  console.log("\n=== 2. Broadcast from Vendor Coordinator to Vendors Only ===");
  const bc2 = await fetch("http://localhost:3000/api/announcements", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: marcusCookies },
    body: JSON.stringify({
      title: "Gate 4 Loading Dock Inbound Logistics",
      message: "Gate 4 is reserved strictly for floral and AV logistics from 11:00 to 13:30.",
      priority: "warning",
      fromRole: "VendorCoordinator",
      fromName: "Julian Drake",
      targetRole: "Vendor"
    })
  });
  const bc2Data = await bc2.json();
  console.log("Broadcast 2 Status:", bc2.status, bc2Data.message);

  // 4. Test what Alex (Vendor) sees
  const vendorRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "vendor@grandcrucatering.com", password: "password123" })
  });
  const vendorCookies = vendorRes.headers.get("set-cookie");
  const vendorFeedRes = await fetch("http://localhost:3000/api/announcements", {
    headers: { cookie: vendorCookies }
  });
  const vendorFeed = await vendorFeedRes.json();
  console.log("\n=== 3. Vendor Feed (Alex Rivera) ===");
  console.log("Active count:", vendorFeed.announcements?.length);
  vendorFeed.announcements?.forEach((a, i) => {
    console.log(`[${i+1}] FROM: ${a.postedByRole} (${a.postedByName}) | TO: ${a.targetRole} | Title: ${a.title}`);
  });

  // 5. Test what Claire (Staff) sees
  const staffRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "claire@aureliaevents.com", password: "password123" })
  });
  const staffCookies = staffRes.headers.get("set-cookie");
  const staffFeedRes = await fetch("http://localhost:3000/api/announcements", {
    headers: { cookie: staffCookies }
  });
  const staffFeed = await staffFeedRes.json();
  console.log("\n=== 4. Staff Feed (Claire Bennett) ===");
  console.log("Active count:", staffFeed.announcements?.length);
  staffFeed.announcements?.forEach((a, i) => {
    console.log(`[${i+1}] FROM: ${a.postedByRole} (${a.postedByName}) | TO: ${a.targetRole} | Title: ${a.title}`);
  });
}

test();
