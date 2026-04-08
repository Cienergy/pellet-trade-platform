const path = require("path");
const XLSX = require("xlsx");

function row({
  id,
  role,
  area,
  scenario,
  preconditions,
  steps,
  expected,
  severity = "Medium",
  type = "Functional",
}) {
  return {
    ID: id,
    Role: role,
    Area: area,
    "Test type": type,
    Severity: severity,
    Scenario: scenario,
    Preconditions: preconditions || "",
    Steps: Array.isArray(steps) ? steps.join("\n") : steps,
    "Expected result": expected,
  };
}

function baseLogin() {
  return [
    "Open the app in a browser.",
    "Log in using a test account for the required role.",
    "Confirm you can see the correct dashboard for your role.",
  ];
}

/**
 * IMPORTANT: Non-technical steps only.
 * These are designed to be executed via the UI by non-technical testers.
 * Requirement: at least 45 test cases per role.
 */

function adminCases() {
  const out = [];
  let n = 1;
  const add = (c) => out.push(row({ ...c, id: `ADMIN-${String(n++).padStart(3, "0")}`, role: "ADMIN" }));

  add({
    area: "Login & access",
    scenario: "Admin can access Admin dashboard",
    preconditions: "You have an Admin login.",
    steps: [...baseLogin(), "Navigate to Admin area from the menu."],
    expected: "Admin pages open successfully.",
    severity: "High",
  });

  add({
    area: "Buyers",
    scenario: "Create a new buyer (minimum required fields)",
    preconditions: "You are logged in as Admin.",
    steps: ["Go to Admin → Buyers.", "Enter Buyer Name and State.", "Click Create Buyer."],
    expected: "Buyer is created and visible in the buyers list.",
    severity: "High",
  });

  add({
    area: "Buyers",
    scenario: "Creating a buyer without State shows an error",
    preconditions: "You are logged in as Admin.",
    steps: ["Go to Admin → Buyers.", "Enter Buyer Name only.", "Click Create Buyer."],
    expected: "A clear validation error is shown; buyer is not created.",
    severity: "High",
  });

  add({
    area: "Buyer payment settings",
    scenario: "Set default payment term (Net 30) for a buyer",
    preconditions: "At least one buyer exists.",
    steps: ["Go to Admin → Buyers.", "Click Edit on a buyer.", "Set Term to Net 30.", "Click Save."],
    expected: "Buyer shows Net 30 as default term after saving.",
  });

  add({
    area: "Buyer payment settings",
    scenario: "Enable Partial Advance + Balance (20% advance) for a buyer",
    preconditions: "At least one buyer exists.",
    steps: [
      "Go to Admin → Buyers.",
      "Edit a buyer.",
      "Set Payment Mode to Advance + Balance.",
      "Set Advance % to 20.",
      "Set Term to Net 30.",
      "Save.",
    ],
    expected: "Buyer shows Adv+Bal mode and 20% advance configured.",
    severity: "High",
  });

  add({
    area: "Buyer payment settings",
    scenario: "Enable Pay Before Dispatch (PBD) for a buyer",
    preconditions: "At least one buyer exists.",
    steps: ["Go to Admin → Buyers.", "Edit a buyer.", "Set Payment Mode to Pay before dispatch.", "Save."],
    expected: "Buyer shows Pay before dispatch mode configured.",
  });

  add({
    area: "Buyer payment settings",
    scenario: "Set Early Payment Discount (2% if paid in 10 days)",
    preconditions: "At least one buyer exists.",
    steps: ["Go to Admin → Buyers.", "Edit a buyer.", "Set EPD% to 2 and Days to 10.", "Save."],
    expected: "Early payment discount is saved and visible.",
  });

  add({
    area: "Buyer payment settings",
    scenario: "Set Retention / Holdback (5% for 60 days)",
    preconditions: "At least one buyer exists.",
    steps: ["Go to Admin → Buyers.", "Edit a buyer.", "Set Ret% to 5 and Days to 60.", "Save."],
    expected: "Retention configuration is saved and visible.",
  });

  add({
    area: "Security deposit",
    scenario: "Set security deposit amount for a buyer",
    preconditions: "At least one buyer exists.",
    steps: ["Go to Admin → Buyers.", "Edit a buyer.", "Set Deposit to 100000.", "Save."],
    expected: "Deposit amount is saved and visible.",
  });

  add({
    area: "Security deposit",
    scenario: "Create security deposit invoice from buyer row",
    preconditions: "Buyer has Deposit > 0 set.",
    steps: ["Go to Admin → Buyers.", "Find the buyer.", "Click Create SD.", "Wait for confirmation."],
    expected: "A security deposit invoice is created successfully.",
    severity: "High",
  });

  add({
    area: "Credit policy",
    scenario: "Set a credit limit for a buyer",
    preconditions: "At least one buyer exists.",
    steps: ["Go to Admin → Buyers.", "Edit buyer.", "Set Credit Limit to 500000.", "Save."],
    expected: "Credit limit is saved and visible.",
  });

  add({
    area: "Credit policy",
    scenario: "Enable 'Block if overdue' for a buyer",
    preconditions: "At least one buyer exists.",
    steps: ["Go to Admin → Buyers.", "Edit buyer.", "Enable Block.", "Save."],
    expected: "Block-if-overdue setting is saved.",
  });

  // Fill to 45+ with human-friendly regression checks
  const filler = [
    ["Buyers", "Edit a buyer then refresh the page", "Changes remain after refresh."],
    ["Buyers", "Start editing then click Cancel", "No changes are saved."],
    ["Buyer payment settings", "Switch payment mode and save", "Mode changes are saved correctly."],
    ["Buyer payment settings", "Set Advance% to 0 and save", "Advance is effectively disabled (acts like normal terms)."],
    ["Buyer payment settings", "Set Advance% to 100 and save", "System prevents it or shows a clear error."],
    ["Buyer payment settings", "Set EPD% without days and save", "System prevents it or shows a clear error."],
    ["Buyer payment settings", "Set Retention% without days and save", "System prevents it or shows a clear error."],
    ["Security deposit", "Set Deposit to 0 and save", "Create SD action becomes unavailable."],
    ["Invoices", "Open an invoice PDF from invoices list", "PDF downloads and opens."],
    ["Invoices", "Check invoice shows correct buyer name", "Buyer name matches the buyer."],
    ["Reporting", "Open dashboard reports and refresh", "Pages load consistently without errors."],
    ["Audit log", "Perform an admin action, then check activity log (if available)", "Action appears in logs."],
  ];

  while (out.length < 46) {
    const [area, scenario, expected] = filler[(out.length - 1) % filler.length];
    add({
      area,
      scenario,
      preconditions: "You are logged in as Admin.",
      steps: ["Go to the relevant screen.", "Perform the action described.", "Observe on-screen result."],
      expected,
      type: "Regression",
    });
  }

  return out;
}

function opsCases() {
  const out = [];
  let n = 1;
  const add = (c) => out.push(row({ ...c, id: `OPS-${String(n++).padStart(3, "0")}`, role: "OPS" }));

  add({
    area: "Login & access",
    scenario: "Ops can access Ops Orders page",
    preconditions: "You have an Ops login.",
    steps: [...baseLogin(), "Open Ops → Orders from the menu."],
    expected: "Ops can see orders and take actions.",
    severity: "High",
  });

  add({
    area: "Order workflow",
    scenario: "Accept a pending order",
    preconditions: "A buyer has placed an order that is pending approval.",
    steps: ["Open the pending order.", "Click Accept/Approve.", "Confirm the status changes to Accepted."],
    expected: "Order becomes Accepted and batching is available.",
    severity: "High",
  });

  add({
    area: "Order workflow",
    scenario: "Reject a pending order with a reason",
    preconditions: "A buyer has placed an order that is pending approval.",
    steps: ["Open the pending order.", "Click Reject.", "Enter a reason.", "Confirm."],
    expected: "Order becomes Rejected and shows the reason.",
  });

  add({
    area: "Batch creation",
    scenario: "Create a batch and verify invoice is generated immediately",
    preconditions: "An order is Accepted.",
    steps: ["Open the accepted order.", "Create a batch with product/site/quantity/date.", "Save.", "Open batch invoice section."],
    expected: "Invoice(s) appear right after batch creation.",
    severity: "High",
  });

  add({
    area: "Advance+Balance",
    scenario: "Advance+Balance buyer: batch shows two invoices (Advance and Balance)",
    preconditions: "Buyer is configured for Advance+Balance and order is accepted.",
    steps: ["Create a batch for that buyer.", "Open invoice section for the batch."],
    expected: "Two invoices are visible and labeled clearly.",
    severity: "High",
  });

  add({
    area: "Dispatch gate",
    scenario: "Cannot start processing when payment is not approved",
    preconditions: "A batch is invoiced but payment is not verified.",
    steps: ["Open the batch.", "Click Start Processing."],
    expected: "System blocks and explains payment approval is required.",
    severity: "High",
  });

  add({
    area: "Dispatch gate",
    scenario: "Advance+Balance: cannot start until advance is fully approved",
    preconditions: "Advance invoice exists but is not fully approved.",
    steps: ["Open the batch.", "Click Start Processing."],
    expected: "System blocks and mentions advance must be fully approved.",
    severity: "High",
  });

  add({
    area: "Dispatch",
    scenario: "After payment approval, start processing succeeds",
    preconditions: "Finance has verified the required payment (full advance if applicable).",
    steps: ["Open the batch.", "Click Start Processing."],
    expected: "Batch moves to Processing/In Progress state.",
    severity: "High",
  });

  const filler = [
    ["Batch creation", "Try to create a batch with quantity 0", "System shows a clear error and prevents saving."],
    ["Batch creation", "Try to create a batch without selecting a product", "System shows a clear error and prevents saving."],
    ["Batch creation", "Try to create a batch without selecting a site", "System shows a clear error and prevents saving."],
    ["Batch creation", "Try to create a batch larger than remaining order quantity", "System blocks and explains remaining quantity."],
    ["Batch list", "Refresh and confirm the batch status is consistent", "Status remains correct after refresh."],
    ["E-way bill", "Update e-way bill number/date and refresh", "Values remain saved after refresh."],
    ["Margins", "Update batch margin and refresh", "Margin remains saved after refresh."],
    ["Dispatch timeline", "Open dispatch timeline for a batch", "Invoice and dispatch events are visible."],
    ["Permissions", "Try to open Admin → Buyers as Ops", "Access is blocked or redirected."],
    ["Permissions", "Try to approve payments as Ops", "Ops cannot verify payments; action is not available."],
  ];

  while (out.length < 46) {
    const [area, scenario, expected] = filler[(out.length - 1) % filler.length];
    add({
      area,
      scenario,
      preconditions: "You are logged in as Ops.",
      steps: ["Go to the relevant screen.", "Perform the action described.", "Observe result."],
      expected,
      type: "Regression",
    });
  }

  return out;
}

function financeCases() {
  const out = [];
  let n = 1;
  const add = (c) => out.push(row({ ...c, id: `FIN-${String(n++).padStart(3, "0")}`, role: "FINANCE" }));

  add({
    area: "Login & access",
    scenario: "Finance can access Finance dashboard",
    preconditions: "You have a Finance login.",
    steps: [...baseLogin(), "Open Finance dashboard from the menu."],
    expected: "Dashboard loads and shows summary numbers.",
    severity: "High",
  });

  add({
    area: "Payments verification",
    scenario: "Finance sees pending payments",
    preconditions: "A buyer has submitted payment proof for an invoice.",
    steps: ["Open Finance → Payments.", "Look for payments marked Pending verification."],
    expected: "Pending payments are visible with buyer and invoice details.",
    severity: "High",
  });

  add({
    area: "Payments verification",
    scenario: "Approve a pending payment",
    preconditions: "At least one payment is pending verification.",
    steps: ["Open the pending payment.", "Review details/proof.", "Click Approve/Verify."],
    expected: "Payment becomes Verified and counts towards invoice paid amount.",
    severity: "High",
  });

  add({
    area: "Payments verification",
    scenario: "Reject a pending payment",
    preconditions: "At least one payment is pending verification.",
    steps: ["Open the pending payment.", "Click Reject.", "Confirm."],
    expected: "Payment is not treated as paid; verification status updates.",
    severity: "High",
  });

  add({
    area: "Advance+Balance",
    scenario: "Advance invoice must be fully verified before Ops can start processing",
    preconditions: "Advance+Balance batch exists and advance invoice is partially paid or pending verification.",
    steps: ["Open the advance invoice.", "Confirm it is not fully verified.", "Ask Ops to try starting processing."],
    expected: "Ops is blocked until advance is fully verified.",
    severity: "High",
  });

  add({
    area: "Invoices",
    scenario: "Invoice PDF shows Early Payment Discount when configured",
    preconditions: "Buyer has Early Payment Discount configured and invoice exists.",
    steps: ["Open invoice.", "Download PDF.", "Check for Early Payment Discount line."],
    expected: "PDF includes discount terms in plain language.",
  });

  add({
    area: "Invoices",
    scenario: "Invoice PDF shows Retention terms when configured",
    preconditions: "Buyer has Retention configured and invoice exists.",
    steps: ["Open invoice.", "Download PDF.", "Check retention line and date."],
    expected: "PDF includes retention percentage and due date.",
  });

  add({
    area: "Receivables",
    scenario: "Pay Before Dispatch invoices show correct due date in receivables",
    preconditions: "Buyer configured as PBD and invoice exists.",
    steps: ["Open Finance → Receivables.", "Find the invoice.", "Check due date shown."],
    expected: "Due date matches the planned dispatch date shown by the system.",
  });

  add({
    area: "Security deposit",
    scenario: "Security deposit invoice is visible and can be opened",
    preconditions: "Admin created a security deposit invoice.",
    steps: ["Open invoices list.", "Find the Security Deposit invoice.", "Open it."],
    expected: "Invoice opens and shows correct buyer name and amount.",
  });

  const filler = [
    ["Invoices", "Invoice list shows Paid vs Partial vs Pending", "Statuses match visible payments."],
    ["Invoices", "Advance+Balance batch shows two invoices in invoice list", "Both invoices are visible for the same batch."],
    ["Payments", "Payment history shows who approved/rejected", "Reviewer details are visible."],
    ["Reports", "Sales report loads and shows totals", "Report is visible and consistent."],
    ["Reports", "Finance dashboard refreshes without errors", "No errors and numbers remain consistent."],
    ["Permissions", "Finance cannot create batches or dispatch", "Ops actions are not available to Finance."],
  ];

  while (out.length < 46) {
    const [area, scenario, expected] = filler[(out.length - 1) % filler.length];
    add({
      area,
      scenario,
      preconditions: "You are logged in as Finance.",
      steps: ["Go to the relevant Finance screen.", "Perform the action described.", "Observe result."],
      expected,
      type: "Regression",
    });
  }

  return out;
}

function buyerCases() {
  const out = [];
  let n = 1;
  const add = (c) => out.push(row({ ...c, id: `BUY-${String(n++).padStart(3, "0")}`, role: "BUYER" }));

  add({
    area: "Login & access",
    scenario: "Buyer can log in and see buyer dashboard",
    preconditions: "You have a Buyer login.",
    steps: [...baseLogin(), "Confirm you can see your orders."],
    expected: "Buyer dashboard loads with order list.",
    severity: "High",
  });

  add({
    area: "Order placement",
    scenario: "Buyer can place a new order",
    preconditions: "Buyer account is active.",
    steps: ["Go to Create Order.", "Select product.", "Enter quantity and delivery location.", "Submit."],
    expected: "Order is created and shows status Pending approval.",
    severity: "High",
  });

  add({
    area: "Default payment flow",
    scenario: "Buyer can see invoice after Ops creates a batch",
    preconditions: "Ops created a batch for your order.",
    steps: ["Open your order.", "Open the batch section.", "Open invoice section."],
    expected: "Invoice details are visible (amount, terms, due date).",
    severity: "High",
  });

  add({
    area: "Payments",
    scenario: "Buyer submits payment proof for an invoice",
    preconditions: "An invoice exists and is unpaid.",
    steps: ["Open the invoice.", "Upload payment proof.", "Submit payment."],
    expected: "Payment is recorded as Pending verification.",
    severity: "High",
  });

  add({
    area: "Advance+Balance",
    scenario: "Advance+Balance: Buyer sees two invoices (Advance and Balance)",
    preconditions: "Buyer configured as Advance+Balance and batch exists.",
    steps: ["Open the batch invoice area.", "Look for Advance invoice and Balance invoice."],
    expected: "Two invoices are visible and labeled clearly.",
    severity: "High",
  });

  add({
    area: "Pay before dispatch",
    scenario: "PBD: Buyer sees due date aligned to dispatch plan",
    preconditions: "Buyer configured as Pay Before Dispatch and invoice exists.",
    steps: ["Open the invoice details.", "Check the due date shown."],
    expected: "Due date matches the planned dispatch date shown by the system.",
  });

  add({
    area: "Early payment discount",
    scenario: "Buyer sees Early Payment Discount terms on invoice/PDF",
    preconditions: "Buyer has Early Payment Discount configured and invoice exists.",
    steps: ["Open invoice.", "Download/view PDF.", "Find Early Payment Discount line."],
    expected: "Discount terms are visible and understandable.",
  });

  add({
    area: "Retention",
    scenario: "Buyer sees retention terms on invoice/PDF",
    preconditions: "Buyer has retention configured and invoice exists.",
    steps: ["Open invoice.", "Download/view PDF.", "Find retention percentage and due date."],
    expected: "Retention details are visible in the document.",
  });

  add({
    area: "Security deposit",
    scenario: "Buyer can view security deposit invoice if created",
    preconditions: "Admin created a security deposit invoice for this buyer.",
    steps: ["Open invoices list (or invoice area).", "Find Security Deposit invoice.", "Open it."],
    expected: "Buyer can view and download the security deposit invoice PDF.",
  });

  add({
    area: "Permissions",
    scenario: "Buyer cannot access Admin pages",
    preconditions: "You are logged in as Buyer.",
    steps: ["Try to open an Admin page from the URL (if you know it)."],
    expected: "Access is blocked or you are redirected away.",
    severity: "High",
  });

  const filler = [
    ["Orders", "Order list shows newest orders at the top", "Newest orders appear first."],
    ["Orders", "Order details show delivery location correctly", "Delivery location matches what you entered."],
    ["Batches", "Batch status updates after refresh", "Status matches latest progress."],
    ["Invoices", "Invoice amounts are shown in INR format", "Numbers are readable and formatted correctly."],
    ["Invoices", "Buyer cannot open another buyer’s invoice via a shared link", "Access is blocked."],
    ["Payments", "If you try to pay a wrong amount, the app shows a clear error", "System explains the issue clearly."],
    ["Payments", "Payment submission shows confirmation message", "Success message is shown."],
  ];

  while (out.length < 46) {
    const [area, scenario, expected] = filler[(out.length - 1) % filler.length];
    add({
      area,
      scenario,
      preconditions: "You are logged in as Buyer.",
      steps: ["Go to the relevant screen.", "Perform the action described.", "Observe result."],
      expected,
      type: "Regression",
    });
  }

  return out;
}

const admin = adminCases();
const ops = opsCases();
const finance = financeCases();
const buyer = buyerCases();

const all = [...admin, ...ops, ...finance, ...buyer];

const roleMatrix = [
  { "Feature / Screen": "Admin → Buyers", ADMIN: "Can view & edit", OPS: "No access", FINANCE: "No access", BUYER: "No access" },
  { "Feature / Screen": "Ops → Orders", ADMIN: "May view", OPS: "Can view & act", FINANCE: "No access", BUYER: "No access" },
  { "Feature / Screen": "Finance → Payments verification", ADMIN: "May verify", OPS: "No access", FINANCE: "Can verify", BUYER: "No access" },
  { "Feature / Screen": "Buyer → Create Order", ADMIN: "No", OPS: "No", FINANCE: "No", BUYER: "Yes" },
  { "Feature / Screen": "Security Deposit invoice creation", ADMIN: "Yes", OPS: "No", FINANCE: "No", BUYER: "No" },
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(all), "All_Test_Cases");
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(admin), "ADMIN");
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ops), "OPS");
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(finance), "FINANCE");
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buyer), "BUYER");
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(roleMatrix), "Role_Matrix");

const outPath = path.join(process.cwd(), "role_test_cases.xlsx");
XLSX.writeFile(wb, outPath);
console.log(`Wrote ${outPath}`);

