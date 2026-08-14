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
