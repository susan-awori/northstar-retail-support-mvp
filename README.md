# 🌟 Northstar Retail Co. — Self-Service AI Support Assistant MVP

![Version](https://img.shields.io/badge/version-1.0.0--MVP-indigo)
![Tech Stack](https://img.shields.io/badge/stack-HTML5%20%7C%20Tailwind%20CSS%20%7C%20Vanilla%20JS-blue)
![Dependencies](https://img.shields.io/badge/dependencies-Zero%20(CDN%20Only)-emerald)
![License](https://img.shields.io/badge/license-MIT-slate)

> An intelligent, no-backend self-service AI support assistant built for **Northstar Retail Co.** to deflect repetitive customer support tickets, answer policy questions via a lightweight RAG engine, and provide transparent escalation paths with real-time deflection metrics.

---

## 🎯 Mission & Context

Root Cause Analysis (5 Whys) at Northstar Retail Co. revealed that support agents were drowning in repetitive inquiries because **no self-service deflection layer existed** between customers and basic system data. 

This MVP proves the ticket deflection effect is real and measurable by addressing the two highest-volume support categories:
1. **Order Status & Package Tracking**
2. **Returns & Refund Processing**

It combines structured data lookups with a zero-hallucination **Policy RAG Search Engine** and a visible **Live Deflection Metrics Panel**.

---

## 📁 Directory Structure

```
Northstart/
├── index.html                 # Single-page web application (Tailwind CSS via CDN)
├── app.js                     # Core business logic, order lookups, return handlers, & intent router
├── rag.js                     # Policy RAG retrieval engine (paragraph chunking & keyword scoring)
├── mockData.json              # Mock dataset (5 orders, 5 inventory items, 3 returns, 5 test customers)
├── go-live-note.md            # Technical integration roadmap for Northstar's engineering team
├── README.md                  # Comprehensive project documentation (this file)
└── policies/                  # RAG Policy Knowledge Base (Markdown files)
    ├── returns-policy.md      # 30-day return window, exchange vs. refund fees ($5.99)
    ├── shipping-policy.md     # Shipping options, timeframes, carrier partners, hold handling
    └── faq.md                 # 8-10 policy FAQs (address changes, order combining, cancellations)
```

---

## ✨ Key Features & Capabilities

### 1. 📦 Order Status Lookup (`#NS-XXXXXX`)
- Enforces strict format validation for 6-digit order numbers (`^#NS-\d{6}$`).
- Returns status-specific guidance:
  - **Processing**: Packing notice (ships within 24–48 hours).
  - **Shipped / Out for Delivery**: Carrier details (`FedEx`, `DHL`, `Kenya Post`), tracking numbers, tracking links, and estimated delivery dates.
  - **On Hold / Delayed**: Empathetic delay notification with 24-hour refresh note.
  - **Delivered**: Delivery confirmation & masked address.
- Increments the live **Deflection Counter** upon successful resolution.

### 2. 🔄 Return Eligibility & Refund Tracker
- **Eligibility Check**: Evaluates whether an order is within the **30-day return window**. Outlines step-by-step return portal instructions (`www.northstarretail.com/returns`), highlighting **Free Store Credit Exchanges** vs. **$5.99 Refund Restock Fees**.
- **Refund Tracking**: Looks up return records (`#RET-1001`) and provides status messaging for `In Transit to Warehouse`, `Received & Inspecting`, or `Refund Issued` (with net amount & release date).

### 3. 🏷️ Stock Availability Checker (Conscience-Compass Honesty)
- Performs SKU + Size lookups against warehouse inventory.
- **Honesty Rule**: Discloses honestly that chat lookups reflect estimated stock. Offers a **"Notify Me" Restock Alert** subscription.
- Logged as a **Soft / Partial Deflection** (distinct from full deflections).

### 4. 📖 Policy RAG Retrieval Engine (`rag.js`)
- Indexes markdown files in `policies/` into paragraph chunks.
- Scores free-text policy questions using keyword overlap + heading relevance + exact phrase matching.
- **Strict Relevance Threshold**: If no chunk meets the confidence score, the engine refuses to guess and escalates to human support.

### 5. 📊 Live Deflection Metrics Widget
- Displays real-time metrics:
  - **Questions Resolved Without Human**: Automated resolutions.
  - **Escalated to Human**: Support tickets generated.
  - **Soft Deflections**: Stock notify alerts.
  - **Deflection Rate %**: Ratio of avoided human tickets.
- Data persists across browser reloads via `localStorage`.

### 6. 👤 Simulated Customer Session Manager
- Pre-populated customer dropdown (*Alex Mercer*, *Beatrice Wanjiru*, *Charles Kipchoge*, *Diana Prince*, *Emmanuel Otieno*).
- Pre-fills email inputs across all forms to demonstrate personalized workflows without requiring real authentication.

---

## 🚀 How to Run locally

Since this project has **zero backend dependencies**, you can run it directly in any web browser:

### Option 1: Direct File Open
Simply double-click [`index.html`](index.html) or drag it into any modern browser (Chrome, Firefox, Edge, Safari).

### Option 2: Local HTTP Server (Recommended for RAG Fetching)
If viewing over HTTP, run a quick local development server:
```bash
# Using Node.js npx serve
npx -y serve c:\Users\user\OneDrive\Desktop\Northstart

# OR using Python built-in HTTP server
cd c:\Users\user\OneDrive\Desktop\Northstart
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

---

## 🧪 Running the Unit Test Suite

The project includes an in-memory Node.js test suite to verify core business logic functions, order validation, return calculations, and RAG retrieval.

To run the automated tests, execute:
```bash
node -e "
const fs = require('fs');
const vm = require('vm');

const mockData = JSON.parse(fs.readFileSync('mockData.json', 'utf8'));
const mockElements = {};
const getMockElem = () => ({ textContent: '', value: '', innerHTML: '', appendChild: () => {}, classList: { add: () => {}, remove: () => {} } });

const sandbox = {
  window: {},
  console: console,
  fetch: (path) => Promise.resolve({ ok: true, text: () => Promise.resolve(fs.readFileSync(path, 'utf8')) }),
  localStorage: { getItem: () => null, setItem: () => {} },
  document: { addEventListener: () => {}, getElementById: (id) => mockElements[id] || (mockElements[id] = getMockElem()), createElement: () => getMockElem() }
};
vm.createContext(sandbox);

vm.runInContext(fs.readFileSync('rag.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('app.js', 'utf8'), sandbox);
vm.runInContext('appData = ' + JSON.stringify(mockData) + ';', sandbox);

async function runTests() {
  await sandbox.window.policyRAG.init();
  console.log('✅ Test 1 (Invalid Format):', sandbox.checkOrderStatus('NS-1234', 'alex@example.com').success === false ? 'PASS' : 'FAIL');
  console.log('✅ Test 2 (Valid Order):', sandbox.checkOrderStatus('#NS-104829', 'alex@example.com').success === true ? 'PASS' : 'FAIL');
  console.log('✅ Test 3 (Return Eligibility):', sandbox.processReturnEligibility('#NS-104829', '08/10/2026').eligible === true ? 'PASS' : 'FAIL');
  console.log('✅ Test 4 (Refund Track):', sandbox.trackRefund('#RET-1001').found === true ? 'PASS' : 'FAIL');
  console.log('✅ Test 5 (Stock Check):', sandbox.checkStock('SKU-DRS-002', 'M').message.includes('OUT OF STOCK') ? 'PASS' : 'FAIL');
  console.log('✅ Test 6 (Escalation):', sandbox.escalateToHuman('Alex', 'alex@example.com', 'Damaged item').ticketId.startsWith('#TKT-') ? 'PASS' : 'FAIL');
  console.log('✅ Test 7 (RAG Search):', sandbox.window.policyRAG.retrieve('Can I change my shipping address after placing an order?').found === true ? 'PASS' : 'FAIL');
}
runTests();
"
```

---

## 📋 Sample Test Data Reference

Use these pre-populated records when testing the application:

| Record Type | Identifier / Code | Email | Expected Result |
| :--- | :--- | :--- | :--- |
| **Order Status** | `#NS-104829` | `alex@example.com` | Out for Delivery via FedEx Express |
| **Order Status** | `#NS-294018` | `beatrice@example.com` | Processing (ships 24-48 hours) |
| **Order Status** | `#NS-492019` | `diana@example.com` | Delayed / On Hold status |
| **Return Track** | `#RET-1001` | `emmanuel@example.com` | In Transit to Warehouse ($124.00 net) |
| **Stock Check** | `SKU-DRS-002` | N/A | Out of Stock + "Notify Me" offer |
| **Stock Check** | `SKU-JKT-001` | N/A | In Stock (14 units available) |

---

## 📄 Documentation & Go-Live Roadmap

For detailed technical specifications regarding how Northstar's backend engineers should transition this MVP into production (including OAuth2 auth, vector database indexing, Kenya Data Protection Act 2022 compliance, and server-side telemetry), refer to [go-live-note.md](https://github.com).

---

*Built with ❤️ for Northstar Retail Co.*

