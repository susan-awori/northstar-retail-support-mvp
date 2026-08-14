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

  // Increment Deflection Metric on Successful Resolution
  metricsState.resolvedWithoutHuman++;
  saveMetrics();
  consecutiveFailures = 0; // Reset failure count

  return {
    success: true,
    message: responseText,
    data: order
  };
}


/**
 * FEATURE 2: Process Return Eligibility & Instructions
 * 
 * Logic Rules:
 * - Checks 30-day window from purchase/delivery date.
 * - If eligible: shows Scenario B1 return portal steps + free exchange vs $5.99 refund fee.
 * - If not eligible (> 30 days): explains 30-day policy window limit.
 * 
 * @param {string} orderId - Order number
 * @param {string} purchaseDateStr - Purchase date (MM/DD/YYYY)
 * @returns {Object} { eligible: boolean, message: string }
 */
function processReturnEligibility(orderId, purchaseDateStr) {
  const cleanOrderId = (orderId || '').trim().toUpperCase();

  // Try finding order in mockData if orderId provided
  const order = appData.orders.find(o => o.orderNumber.toUpperCase() === cleanOrderId);
  const dateToTest = order ? order.purchaseDate : (purchaseDateStr || '08/01/2026');

  // Calculate days elapsed (Current mock baseline date: Aug 14, 2026)
  const currentDate = new Date('2026-08-14');
  const purchaseDate = new Date(dateToTest);
  const diffTime = Math.abs(currentDate - purchaseDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const IS_ELIGIBLE = diffDays <= 30;

  let responseMessage = '';

  if (IS_ELIGIBLE) {
    responseMessage = `🔄 **Return & Exchange Eligibility: APPROVED**\n\nOrder **${cleanOrderId || '#NS-XXXXXX'}** was purchased on ${dateToTest} (${diffDays} days ago) and is **eligible** for return or exchange under our 30-day policy.\n\n**Next Steps to Start Your Return:**\n1. Visit our Return Portal: \`www.northstarretail.com/returns\`\n2. Enter your Order Number (**${cleanOrderId || '#NS-XXXXXX'}**) and Email.\n3. Select your preferred option:\n   - 🎁 **Exchange for another size/color (FREE)** — Zero restocking fee!\n   - 💳 **Refund to original payment method** — A flat $5.99 shipping/processing fee will be deducted.\n4. Print your prepaid return shipping label and drop off the package.\n\n*Refunds process within 3–5 business days after our warehouse receives and inspects your item.*`;

    // Increment deflection count
    metricsState.resolvedWithoutHuman++;
    saveMetrics();
    consecutiveFailures = 0;
  } else {
    responseMessage = `⚠️ **Return Eligibility: EXPIRED**\n\nOrder **${cleanOrderId || '#NS-XXXXXX'}** was purchased on ${dateToTest} (${diffDays} days ago). Our return policy strictly requires returns to be initiated within **30 days** of purchase.\n\nIf your item arrived damaged or defective, please click **Submit a Ticket** below to request an exception review with our support team.`;
    
    // Non-eligible still deflects repetitive return ticket if policy explained, but user can escalate
    metricsState.resolvedWithoutHuman++;
    saveMetrics();
  }

  return {
    eligible: IS_ELIGIBLE,
    message: responseMessage,
    daysElapsed: diffDays
  };
}

/**
 * FEATURE 3: Track Refund Status
 * 
 * @param {string} query - Order number, Return ID (#RET-XXXX), or Tracking ID
 * @returns {Object} { found: boolean, message: string }
 */
function trackRefund(query) {
  const clean = (query || '').trim().toUpperCase();

  const retRecord = appData.returns.find(r => 
    r.returnId.toUpperCase() === clean || 
    r.orderNumber.toUpperCase() === clean || 
    r.trackingId.toUpperCase() === clean
  );

  if (!retRecord) {
    return {
      found: false,
      message: `🔎 We couldn't find an active return record matching **${clean}**.\n\nIf you recently dropped off your parcel, please allow 24 hours for carrier scan updates. You can also start a return at \`www.northstarretail.com/returns\`.`
    };
  }

  let statusMsg = '';
  switch (retRecord.status) {
    case 'In Transit to Warehouse':
      statusMsg = `🚚 **Refund Status: In Transit to Warehouse**\n\n- **Return ID**: ${retRecord.returnId}\n- **Order Number**: ${retRecord.orderNumber}\n- **Courier Status**: Package is in transit to our return hub.\n- **Estimated Refund**: ${retRecord.netRefund}\n\n*Once received at our hub, quality inspection takes 1–2 business days before refund release.*`;
      break;

    case 'Received & Inspecting':
      statusMsg = `🔍 **Refund Status: Received & Inspecting**\n\n- **Return ID**: ${retRecord.returnId}\n- **Order Number**: ${retRecord.orderNumber}\n- **Status**: Package arrived at warehouse. Quality inspection is in progress.\n- **Expected Approval**: Within 24-48 business hours.`;
      break;

    case 'Refund Issued':
      statusMsg = `💰 **Refund Status: Refund Issued**\n\n- **Return ID**: ${retRecord.returnId}\n- **Order Number**: ${retRecord.orderNumber}\n- **Net Refund Amount**: **${retRecord.netRefund}**\n- **Issued Date**: ${retRecord.refundDate}\n\n*Please allow 3–5 business days for your banking institution to reflect the credit.*`;
      break;

    default:
      statusMsg = `ℹ️ Return **${retRecord.returnId}** status: **${retRecord.status}**. ${retRecord.statusDetails}`;
  }

  // Increment deflection count
  metricsState.resolvedWithoutHuman++;
  saveMetrics();
  consecutiveFailures = 0;

  return {
    found: true,
    message: statusMsg
  };
}


/**
 * FEATURE 4: Stock Checker Widget (Honest Mock Limitations per Conscience Compass)
 * 
 * Logic Rules:
 * - Discloses honestly that real-time stock cannot be guaranteed via chat.
 * - Offers a "Notify Me" back-in-stock alert.
 * - LOGS AS A PARTIAL/SOFT DEFLECTION (does NOT count as full deflection).
 * 
 * @param {string} sku - Stock Keeping Unit (e.g. SKU-DRS-002)
 * @param {string} size - Size (S, M, L, 38, etc.)
 * @returns {Object} { message: string }
 */
function checkStock(sku, size) {
  const cleanSku = (sku || '').trim().toUpperCase();
  const cleanSize = (size || '').trim().toUpperCase();

  const item = appData.inventory.find(i => 
    i.sku.toUpperCase() === cleanSku || 
    i.name.toUpperCase().includes(cleanSku)
  );

  let responseMessage = '';

  // Conscience Compass Honesty Note
  const honestyNotice = `\n\n*Note: To prevent inventory discrepancies during peak hours, this widget shows estimated warehouse stock. For real-time cart reservation, please visit the product page directly.*`;

  if (item) {
    if (item.inStock) {
      responseMessage = `🏷️ **Inventory Status: IN STOCK**\n\n- **Item**: ${item.name} (\`${item.sku}\`)\n- **Size**: ${cleanSize || item.size}\n- **Availability**: Available at warehouse (${item.stockQuantity} units remaining).${honestyNotice}`;
    } else {
      responseMessage = `📌 **Inventory Status: OUT OF STOCK**\n\n- **Item**: ${item.name} (\`${item.sku}\`)\n- **Size**: ${cleanSize || item.size}\n- **Availability**: Currently unavailable at central warehouse.\n\n🔔 **Would you like to be notified when this item is restocked?**\nClick below to register your email for a **Restock Notification Alert**.${honestyNotice}`;
    }
  } else {
    responseMessage = `🔎 **Stock Search for "${cleanSku}"**\n\nWe couldn't find exact SKU \`${cleanSku}\`. Popular items like the *All-Weather Transit Jacket* (\`SKU-JKT-001\`) and *Waterproof Backpack* (\`SKU-BAG-005\`) are currently in stock.${honestyNotice}`;
  }

  // Increment Partial / Soft Deflection Counter (Distinct from main deflection counter)
  metricsState.softDeflections++;
  saveMetrics();

  return {
    message: responseMessage
  };
}


/**
 * FEATURE 5: Escalate to Human Support Ticket
 * 
 * Trigger Cases:
 * - Explicit customer request ("agent", "human", "representative")
 * - 2 consecutive failed-understanding queries
 * - Complex/high-risk scenarios (damaged goods, wrong items, account changes)
 * 
 * @param {string} name - Customer Name
 * @param {string} email - Customer Email
 * @param {string} summary - Problem description
 * @returns {Object} { ticketId: string, message: string }
 */
function escalateToHuman(name, email, summary) {
  const ticketId = `#TKT-${Math.floor(100000 + Math.random() * 900000)}`;
  const custName = name || (currentCustomer ? currentCustomer.name : 'Customer');
  const custEmail = email || (currentCustomer ? currentCustomer.email : 'Not provided');
  const issueSummary = summary || 'General support inquiry escalated from self-service widget.';

  const responseText = `🎧 **Support Ticket Generated: ${ticketId}**\n\nThank you, **${custName}**. We have escalated your request directly to Northstar's senior customer care team.\n\n- **Ticket ID**: \`${ticketId}\`\n- **Email Contact**: ${custEmail}\n- **Issue Summary**: "${issueSummary}"\n- **Estimated Response Time**: Within 2 to 4 business hours.\n\nA confirmation copy has been sent to your email. You can close this chat or ask another question.`;

  // Increment Escalated Counter (Not the deflection counter)
  metricsState.escalatedToHuman++;
  saveMetrics();
  consecutiveFailures = 0; // Reset failure counter

  return {
    ticketId,
    message: responseText
  };
}


// ============================================================================
// 4. UNIFIED CHAT CONTROLLER & INTENT ROUTER
// ============================================================================

/**
 * Handles incoming chat messages from the user interface.
 * Routes structured lookups to specific logic handlers and unstructured queries to policy RAG.
 * 
 * @param {string} userMessage - Text entered by customer
 */
async function handleUserChatMessage(userMessage) {
  const trimmed = (userMessage || '').trim();
  if (!trimmed) return;

  // Render User Message in Chat Window
  appendChatMessage('user', trimmed);

  // Show typing indicator
  showTypingIndicator();

  // Simulate realistic network delay for smooth UX (400ms)
  setTimeout(async () => {
    hideTypingIndicator();
    processChatMessageIntents(trimmed);
  }, 400);
}

/**
 * Internal intent processor for chat text.
 * @param {string} input - Cleaned user message text
 */
function processChatMessageIntents(input) {
  const lower = input.toLowerCase();

  // --------------------------------------------------------------------------
  // ESCALATION RULE A: Explicit Human Request or High-Risk Trigger
  // --------------------------------------------------------------------------
  const humanTriggers = ['human', 'agent', 'representative', 'person', 'support team', 'speak to someone', 'talk to human', 'real person'];
  const highRiskTriggers = ['damaged', 'wrong item', 'stolen package', 'fraud', 'cancel account'];

  const isExplicitHumanRequest = humanTriggers.some(term => lower.includes(term));
  const isHighRiskScenario = highRiskTriggers.some(term => lower.includes(term));

  if (isExplicitHumanRequest || isHighRiskScenario) {
    const reason = isHighRiskScenario ? 'High-risk item issue requiring human review' : 'Explicit customer request for human agent';
    appendChatMessage('bot', `I completely understand. Let me connect you directly to our human customer support team.`);
    openHandoffModal(reason, input);
    return;
  }

  // --------------------------------------------------------------------------
  // INTENT 1: Order Status Intent (#NS-XXXXXX regex or keywords)
  // --------------------------------------------------------------------------
  const nsOrderRegex = /#?NS-\d{6}/i;
  const orderMatch = input.match(nsOrderRegex);

  if (orderMatch || lower.includes('order status') || lower.includes('where is my package') || lower.includes('track my order')) {
    let orderNum = orderMatch ? orderMatch[0] : '';
    
    // Normalize format to include '#'
    if (orderNum && !orderNum.startsWith('#')) orderNum = '#' + orderNum;

    if (!orderNum) {
      appendChatMessage('bot', `I can help you check your order status! Please enter your **6-digit Order Number** in **#NS-XXXXXX** format (e.g. \`#NS-104829\`) along with your email address.`);
      return;
    }

    const emailToUse = currentCustomer ? currentCustomer.email : '';
    const result = checkOrderStatus(orderNum, emailToUse);
    appendChatMessage('bot', result.message);
    if (result.success) attachFeedbackBanner('order-lookup');
    return;
  }

    // --------------------------------------------------------------------------
  // INTENT 2: Return Eligibility & Instructions
  // --------------------------------------------------------------------------
  if (lower.includes('return') || lower.includes('exchange') || lower.includes('send back') || lower.includes('too small') || lower.includes('wrong size')) {
    const result = processReturnEligibility('#NS-XXXXXX', '08/01/2026');
    appendChatMessage('bot', result.message);
    attachFeedbackBanner('returns-lookup');
    return;
  }

  // --------------------------------------------------------------------------
  // INTENT 3: Refund Tracking Intent
  // --------------------------------------------------------------------------
  const retRegex = /#?RET-\d{4}/i;
  const retMatch = input.match(retRegex);

  if (retMatch || lower.includes('refund status') || lower.includes('where is my refund') || lower.includes('track refund')) {
    const query = retMatch ? retMatch[0] : (currentCustomer ? currentCustomer.email : '#RET-1001');
    const result = trackRefund(query);
    appendChatMessage('bot', result.message);
    attachFeedbackBanner('refund-lookup');
    return;
  }

  // --------------------------------------------------------------------------
  // INTENT 4: Stock / Inventory Intent
  // --------------------------------------------------------------------------
  if (lower.includes('stock') || lower.includes('inventory') || lower.includes('available in size') || lower.includes('sku-')) {
    const skuMatch = input.match(/SKU-[A-Z0-9-]+/i);
    const sku = skuMatch ? skuMatch[0] : 'SKU-JKT-001';
    const result = checkStock(sku, 'M');
    appendChatMessage('bot', result.message);
    attachFeedbackBanner('stock-lookup');
    return;
  }

  // --------------------------------------------------------------------------
  // INTENT 5: Policy RAG Search (Free-Text Policy & FAQ Questions)
  // --------------------------------------------------------------------------
  const ragResult = window.policyRAG.retrieve(input, 2);

  if (ragResult.found && ragResult.chunks.length > 0) {
    const topChunk = ragResult.chunks[0];
    
    // Clean markdown headings for clean bot presentation
    const cleanChunkText = topChunk.text.replace(/^#+\s*/, '');
    
    const botResponse = `📖 **According to Northstar's official ${topChunk.file}:**\n\n${cleanChunkText}\n\n*Reference Document: ${topChunk.file} — "${topChunk.title}"*`;
    
    appendChatMessage('bot', botResponse);
    attachFeedbackBanner('rag-policy');
    
    metricsState.resolvedWithoutHuman++;
    saveMetrics();
    consecutiveFailures = 0; // Reset failure count on successful RAG answer
    return;
  }

  // --------------------------------------------------------------------------
  // FALLBACK & CONSECUTIVE FAILURE ESCALATION
  // If query fails RAG threshold and no structured intent matches
  // --------------------------------------------------------------------------
  consecutiveFailures++;
  console.log(`[Consecutive Failure Count]: ${consecutiveFailures}`);

  if (consecutiveFailures >= 2) {
    // Operational Rule: Trigger escalation after 2 consecutive failed understanding inputs
    appendChatMessage('bot', `🤔 I want to make sure you get the exact right answer, but I'm having trouble understanding your question.\n\nPer our policy, I am transferring you to a human team member so you aren't stuck in a loop.`);
    openHandoffModal('2 Consecutive Unrecognized Queries', input);
    consecutiveFailures = 0;
  } else {
    appendChatMessage('bot', `I'm sorry, I couldn't find a direct policy match for your question in our system.\n\nCould you try rephrasing (e.g. asking about *"order status #NS-104829"*, *"return policy"*, or *"shipping times"*), or click **Submit a Ticket** below to connect with our support team?`);
    attachFeedbackBanner('failed-query');
  }
}


// ============================================================================
// 5. UI RENDERING & DOM HELPERS
// ============================================================================

/**
 * Appends a message bubble into the live chat window.
 * 
 * @param {string} sender - 'user', 'bot', or 'system'
 * @param {string} text - Markdown/HTML formatted message
 */
function appendChatMessage(sender, text) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.className = `flex gap-3 mb-4 text-sm animate-fade-in ${sender === 'user' ? 'justify-end' : 'justify-start'}`;

  // Process simple Markdown formatting (bold, code, links)
  const formattedText = formatMarkdownToHTML(text);

  if (sender === 'user') {
    wrapper.innerHTML = `
      <div class="max-w-[82%] bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-md">
        <p class="leading-relaxed whitespace-pre-line">${formattedText}</p>
      </div>
    `;
  } else if (sender === 'bot') {
    wrapper.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0">
        NS
      </div>
      <div class="max-w-[82%] bg-slate-800/90 border border-slate-700 text-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-md">
        <div class="leading-relaxed whitespace-pre-line prose prose-invert prose-sm">${formattedText}</div>
      </div>
    `;
  } else { // system message
    wrapper.innerHTML = `
      <div class="w-full text-center my-2">
        <span class="inline-block bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs px-3 py-1.5 rounded-full">
          ${formattedText}
        </span>
      </div>
    `;
  }

  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

/**
 * Converts basic markdown tags into HTML for rendering.
 */
function formatMarkdownToHTML(text) {
  if (!text) return '';
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-900 text-cyan-300 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-xs">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-cyan-400 hover:underline font-medium font-semibold">$1 ↗</a>');
  return html;
}

/**
 * Attaches the Deflection Feedback Banner after bot answers.
 * "Did this answer your question? [Yes] [No, submit ticket]"
 */
function attachFeedbackBanner(contextId) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const banner = document.createElement('div');
  banner.className = 'my-3 p-3 bg-slate-900/80 border border-slate-700/70 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 animate-fade-in';
  banner.id = `feedback-banner-${Date.now()}`;
  
  banner.innerHTML = `
    <span class="text-slate-300 font-medium">Did this answer your question?</span>
    <div class="flex items-center gap-2">
      <button onclick="handleFeedbackResponse(true, '${banner.id}')" class="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors font-medium">
        👍 Yes, thanks
      </button>
      <button onclick="handleFeedbackResponse(false, '${banner.id}')" class="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-lg transition-colors font-medium">
        👎 No, submit ticket
      </button>
    </div>
  `;

  container.appendChild(banner);
  container.scrollTop = container.scrollHeight;
}

/**
 * Handles user clicks on the Feedback Banner.
 */
function handleFeedbackResponse(isPositive, bannerId) {
  const banner = document.getElementById(bannerId);
  if (banner) {
    if (isPositive) {
      banner.innerHTML = `<span class="text-emerald-400 font-semibold">✨ Thank you for your feedback! Glad we could help.</span>`;
    } else {
      banner.innerHTML = `<span class="text-rose-400 font-semibold">Routing you to human support ticket form...</span>`;
      openHandoffModal('User reported answer did not resolve question', 'Feedback banner clicked: No');
    }
  }
}

/**
 * Shows the animated typing indicator dots.
 */
function showTypingIndicator() {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const indicator = document.createElement('div');
  indicator.id = 'typing-indicator';
  indicator.className = 'flex gap-3 mb-4 text-sm justify-start items-center';
  indicator.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold shrink-0">NS</div>
    <div class="bg-slate-800 border border-slate-700 text-slate-400 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-md flex items-center gap-1.5">
      <span class="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span>
      <span class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
      <span class="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
    </div>
  `;
  container.appendChild(indicator);
  container.scrollTop = container.scrollHeight;
}

/**
 * Hides typing indicator.
 */
function hideTypingIndicator() {
  const elem = document.getElementById('typing-indicator');
  if (elem) elem.remove();
}

/**
 * Opens Human Handoff Modal/Form.
 */
function openHandoffModal(reason, summary) {
  const modal = document.getElementById('handoff-modal');
  const summaryInput = document.getElementById('handoff-summary');
  
  if (summaryInput) {
    summaryInput.value = summary ? `[Reason: ${reason}] ${summary}` : `Customer support request regarding Northstar products/orders.`;
  }
  
  if (modal) modal.classList.remove('hidden');
}

/**
 * Closes Human Handoff Modal.
 */
function closeHandoffModal() {
  const modal = document.getElementById('handoff-modal');
  if (modal) modal.classList.add('hidden');
}
