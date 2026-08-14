/**
 * ============================================================================
 * NORTHSTAR RETAIL CO. - MAIN APPLICATION LOGIC (app.js)
 * ============================================================================
 * 
 * ARCHITECTURE OVERVIEW FOR BEGINNER DEVELOPERS:
 * This file connects the single-page HTML user interface (index.html) to our
 * local mock dataset (mockData.json) and policy RAG search engine (rag.js).
 * 
 * CORE RESPONSIBILITIES:
 * 1. Structured Data Lookups: Order Status, Return Eligibility, Refund Tracking.
 * 2. Conscience-Compass Features: Honest mock limits for stock checks ("Notify Me").
 * 3. Escalation Management: Ticket generation on human requests or 2 failed query attempts.
 * 4. Deflection Metrics State: Real-time calculation of avoided support tickets.
 * 5. Simulated Customer Session: Easy profile switching without touch real passwords.
 * ============================================================================
 */

// ============================================================================
// 1. GLOBAL STATE & METRICS MANAGEMENT
// ============================================================================

// App Data Storage loaded from mockData.json
let appData = {
  customers: [],
  orders: [],
  inventory: [],
  returns: []
};

// Currently selected mock customer session (Simulated Login)
// COMMENT: This simulated session MUST NEVER be connected to real customer data or real databases.
// It exists solely for prototype demonstration to show personalized pre-filled workflows.
let currentCustomer = null;

// Failed understanding counter (Triggers escalation on 2 consecutive failed queries)
let consecutiveFailures = 0;

// Pending question context for feedback banner
let lastAnsweredQuestionContext = null;

// Real-time Deflection Metrics State
// Stored in browser localStorage for demo persistence across page reloads
const METRICS_STORAGE_KEY = 'northstar_deflection_metrics_v1';

let metricsState = {
  resolvedWithoutHuman: 0, // Hard deflections (Order lookup, returns, RAG answers answered successfully)
  escalatedToHuman: 0,     // Escalated tickets (Damaged goods, agent requests, low-confidence queries)
  softDeflections: 0       // Partial deflections (Stock "Notify Me" requests)
};

/**
 * Loads deflection metrics from browser localStorage or initializes default zeroes.
 */
function loadMetrics() {
  const saved = localStorage.getItem(METRICS_STORAGE_KEY);
  if (saved) {
    try {
      metricsState = JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse stored metrics, resetting to defaults.');
    }
  }
  updateMetricsUI();
}

/**
 * Saves metrics to localStorage and refreshes the on-screen dashboard.
 */
function saveMetrics() {
  localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metricsState));
  updateMetricsUI();
}

/**
 * Updates the Deflection Widget UI counters in real time.
 */
function updateMetricsUI() {
  const resolvedElem = document.getElementById('metric-resolved');
  const escalatedElem = document.getElementById('metric-escalated');
  const softElem = document.getElementById('metric-soft');
  const rateElem = document.getElementById('metric-rate');

  if (resolvedElem) resolvedElem.textContent = metricsState.resolvedWithoutHuman;
  if (escalatedElem) escalatedElem.textContent = metricsState.escalatedToHuman;
  if (softElem) softElem.textContent = metricsState.softDeflections;

  // Calculate Deflection Percentage Rate
  const totalQueries = metricsState.resolvedWithoutHuman + metricsState.escalatedToHuman;
  const ratePercent = totalQueries > 0 
    ? Math.round((metricsState.resolvedWithoutHuman / totalQueries) * 100) 
    : 100;
    
  if (rateElem) rateElem.textContent = `${ratePercent}% Deflection Rate`;
}

/**
 * Resets deflection counters (Useful for demo restarts).
 */
function resetMetrics() {
  metricsState = { resolvedWithoutHuman: 0, escalatedToHuman: 0, softDeflections: 0 };
  saveMetrics();
  appendChatMessage('system', 'Deflection counters have been reset to zero for demo testing.');
}

// ============================================================================
// 2. DATA INITIALIZATION & SIMULATED LOGIN
// ============================================================================

/**
 * Main initialization function run when DOM content is loaded.
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Load mockData.json
  await loadMockData();
  
  // Initialize Policy RAG Engine
  await window.policyRAG.init();

  // Load Metrics state from localStorage
  loadMetrics();

  // Populate Customer Dropdown for Simulated Login
  populateCustomerDropdown();

  // Attach Event Listeners
  setupEventListeners();

  console.log('[Northstar App] Initialized successfully.');
});

/**
 * Fetches mockData.json asynchronously.
 */
async function loadMockData() {
  try {
    const response = await fetch('mockData.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    appData = await response.json();
    console.log('[Mock Data Loaded]', appData);
  } catch (err) {
    console.error('Failed to load mockData.json:', err);
    // Fallback inline data if fetch fails locally without webserver
    appendChatMessage('system', '⚠️ Warning: Could not fetch mockData.json via HTTP. If opening directly via file://, please use a local live server or rely on fallback mock state.');
  }
}

/**
 * Pre-populates the "Log in as test customer" dropdown.
 */
function populateCustomerDropdown() {
  const selectElem = document.getElementById('simulated-login-select');
  if (!selectElem) return;

  selectElem.innerHTML = '<option value="">Guest Mode (Not logged in)</option>';
  
  appData.customers.forEach(customer => {
    const opt = document.createElement('option');
    opt.value = customer.id;
    opt.textContent = `👤 ${customer.name} (${customer.email})`;
    selectElem.appendChild(opt);
  });
}

/**
 * Handles switching the simulated customer session.
 * @param {string} customerId - Selected customer ID from dropdown
 */
function handleCustomerSessionSwitch(customerId) {
  if (!customerId) {
    currentCustomer = null;
    updateSessionUI('Guest Customer', '');
    return;
  }

  const found = appData.customers.find(c => c.id === customerId);
  if (found) {
    currentCustomer = found;
    updateSessionUI(found.name, found.email);

    // Pre-fill form inputs across UI
    prefillCustomerEmailInputs(found.email);
    
    appendChatMessage('system', `✨ **Simulated Login**: Switched active session to **${found.name}** (${found.email}). Lookups will automatically default to your email.`);
  }
}

/**
 * Updates UI headers to reflect active simulated session.
 */
function updateSessionUI(name, email) {
  const badgeName = document.getElementById('active-customer-name');
  if (badgeName) {
    badgeName.textContent = email ? `${name} (${email})` : name;
  }
}

/**
 * Pre-fills email input fields across all quick-lookup cards.
 */
function prefillCustomerEmailInputs(email) {
  const orderEmailInput = document.getElementById('order-email-input');
  const returnEmailInput = document.getElementById('return-email-input');
  const handoffEmailInput = document.getElementById('handoff-email');

  if (orderEmailInput) orderEmailInput.value = email;
  if (returnEmailInput) returnEmailInput.value = email;
  if (handoffEmailInput) handoffEmailInput.value = email;
}


// ============================================================================
// 3. CORE BUSINESS LOGIC FUNCTIONS (Per Specification Requirements)
// ============================================================================

/**
 * FEATURE 1: Order Status Lookup
 * 
 * Logic Rules:
 * - Validates #NS-XXXXXX format first using Regex /^#NS-\d{6}$/i.
 * - If format is invalid, returns explicit format error without guessing.
 * - Checks status:
 *   - "Processing": "Your order is being packed at our warehouse. It typically ships within 24–48 hours."
 *   - "Shipped" / "Out for Delivery": gives carrier name + tracking link + estimated arrival date.
 *   - "On Hold" / "Delayed": empathetic delay message + updates refresh every 24h.
 *   - "Delivered": confirms delivery date & masked address.
 * 
 * @param {string} orderId - Order number input (e.g. #NS-104829)
 * @param {string} email - Customer email address
 * @returns {Object} { success: boolean, message: string, data?: object }
 */
function checkOrderStatus(orderId, email) {
  const cleanOrderId = (orderId || '').trim().toUpperCase();
  const cleanEmail = (email || '').trim().toLowerCase();

  // Rule 1: Strict Format Validation (#NS-XXXXXX where X is 6 digits)
  const formatRegex = /^#NS-\d{6}$/i;
  if (!formatRegex.test(cleanOrderId)) {
    return {
      success: false,
      message: `❌ **Invalid Order Format**: Order numbers must follow the **#NS-XXXXXX** format (e.g., #NS-104829). Please check your order confirmation email and try again.`
    };
  }

  // Lookup in mock dataset
  const order = appData.orders.find(o => o.orderNumber.toUpperCase() === cleanOrderId);

  if (!order) {
    return {
      success: false,
      message: `🔍 We couldn't find order **${cleanOrderId}** in our system. Please double-check the 6-digit order number from your receipt.`
    };
  }

  // Email verification check (if email was provided)
  if (cleanEmail && order.customerEmail.toLowerCase() !== cleanEmail) {
    return {
      success: false,
      message: `⚠️ Order **${cleanOrderId}** was found, but the email address (**${cleanEmail}**) does not match our records for this order. Please verify your email.`
    };
  }

  // Build Status Response Message per Operational Rules
  let responseText = '';

  switch (order.status) {
    case 'Processing':
      responseText = `📦 **Order Status: Processing**\n\nYour order **${order.orderNumber}** is currently being packed at our central warehouse. It typically ships within 24–48 hours.\n\n- **Purchase Date**: ${order.purchaseDate}\n- **Estimated Delivery**: ${order.estimatedDelivery}\n- **Destination**: ${order.shippingAddress}`;
      break;

    case 'Shipped':
    case 'Out for Delivery':
      responseText = `🚚 **Order Status: ${order.status}**\n\nGreat news! Order **${order.orderNumber}** has left our warehouse and is with **${order.carrier}**.\n\n- **Tracking Number**: \`${order.trackingNumber}\`\n- **Tracking Link**: [Track Package on ${order.carrier}](${order.trackingUrl})\n- **Estimated Arrival**: ${order.estimatedDelivery}\n- **Delivery Address**: ${order.shippingAddress}`;
      break;

    case 'On Hold':
    case 'Delayed':
      responseText = `⏳ **Order Status: Delayed / On Hold**\n\nWe apologize for the wait! Order **${order.orderNumber}** is currently experiencing a short fulfillment delay. Our logistics team is actively coordinating with **${order.carrier}**.\n\n- **Estimated Delivery**: ${order.estimatedDelivery}\n- **Status Note**: Tracking updates refresh automatically every 24 hours.`;
      break;

    case 'Delivered':
      responseText = `✅ **Order Status: Delivered**\n\nOrder **${order.orderNumber}** was successfully delivered to **${order.shippingAddress}** on ${order.estimatedDelivery} via **${order.carrier}**.\n\n- **Tracking Number**: \`${order.trackingNumber}\``;
      break;

    default:
      responseText = `ℹ️ Order **${order.orderNumber}** status: **${order.status}**. ${order.statusDetails}`;
  }

