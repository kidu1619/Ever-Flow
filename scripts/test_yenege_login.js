const fetch = globalThis.fetch;

async function test() {
  // 1. Login as Yenege
  const yenegeRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "superadmin@yenegeacademy.com", password: "password123" })
  });
  const yenegeCookies = yenegeRes.headers.get("set-cookie");
  console.log("=== 1. Yenege Initial Login ===");
  const yenegeMeRes = await fetch("http://localhost:3000/api/auth/me", {
    headers: { cookie: yenegeCookies || "" }
  });
  const yenegeMe = await yenegeMeRes.json();
  console.log("Initial Active Org:", yenegeMe.activeOrganization?.name);
  console.log("Is Platform Root:", yenegeMe.activeOrganization?.isPlatformRoot);
  console.log("Available Tenant Orgs:", yenegeMe.organizations?.map(o => o.name));

  const aureliaOrg = yenegeMe.organizations?.find(o => o.name.includes("Aurelia"));
  if (aureliaOrg) {
    // 2. Yenege inspects Aurelia Events
    console.log("\n=== 2. Yenege Inspects Aurelia Events ===");
    const switchRes = await fetch("http://localhost:3000/api/auth/switch-org", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        cookie: yenegeCookies || ""
      },
      body: JSON.stringify({ organizationId: aureliaOrg.id })
    });
    const switchCookies = switchRes.headers.get("set-cookie");
    const combinedCookies = `${yenegeCookies}; ${switchCookies}`;
    
    const inspectMeRes = await fetch("http://localhost:3000/api/auth/me", {
      headers: { cookie: combinedCookies }
    });
    const inspectMe = await inspectMeRes.json();
    console.log("Inspected Org Name:", inspectMe.activeOrganization?.name);
    console.log("Is Inspecting:", inspectMe.activeOrganization?.isInspecting);

    // 3. Yenege returns to Master Console
    console.log("\n=== 3. Yenege Returns to Master Console ===");
    const returnRes = await fetch("http://localhost:3000/api/auth/switch-org", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        cookie: combinedCookies
      },
      body: JSON.stringify({ organizationId: "platform-master-yenege" })
    });
    const returnCookies = returnRes.headers.get("set-cookie");
    const finalCookies = `${combinedCookies}; ${returnCookies}`;

    const finalMeRes = await fetch("http://localhost:3000/api/auth/me", {
      headers: { cookie: finalCookies }
    });
    const finalMe = await finalMeRes.json();
    console.log("Final Active Org Name:", finalMe.activeOrganization?.name);
    console.log("Is Platform Root:", finalMe.activeOrganization?.isPlatformRoot);
  }
}

test();
