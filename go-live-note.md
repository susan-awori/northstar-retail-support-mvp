# Northstar Retail Co. AI Support Widget — Go-Live Architecture Note

> [!IMPORTANT]
> **Target Audience**: Senior Full-Stack Engineers, Product Managers, and DevOps leads at Northstar Retail Co.
> **Purpose**: This document bridges the gap between the student/MVP deflection layer prototype and the production-ready Phase 2 integration. Do not wire real customer credentials or databases into the MVP without completing the Phase 2 requirements detailed below.

---
## 1. What Works End-to-End in the MVP Deliverable

The current MVP prototype running via [`index.html`](file:///c:/Users/user/OneDrive/Desktop/Northstart/index.html) fulfills all operational deflection requirements for Northstar Retail Co.:

- **Structured Data Lookups**:
  - Format validation enforcing `#NS-XXXXXX` (6-digit order numbers).
  - Order status reporting for `Processing`, `Shipped`, `Out for Delivery`, `Delivered`, and `On Hold` / `Delayed` statuses.
  - Return eligibility validation based on a strict 30-day window from purchase/delivery date.
  - Return tracking status reporting (`In Transit to Warehouse`, `Received & Inspecting`, `Refund Issued`).
- **Policy RAG Retrieval (`rag.js`)**:
  - In-browser paragraph chunking of policy markdown files ([`returns-policy.md`](file:///c:/Users/user/OneDrive/Desktop/Northstart/policies/returns-policy.md), [`shipping-policy.md`](file:///c:/Users/user/OneDrive/Desktop/Northstart/policies/shipping-policy.md), [`faq.md`](file:///c:/Users/user/OneDrive/Desktop/Northstart/policies/faq.md)).
  - Keyword overlap + section heading scoring with minimum confidence thresholding.
  - Fallback to human ticket generation when confidence is low (zero guessing/hallucination).
- **Ticket Deflection Metrics Engine**:
  - Live calculation of *Questions Resolved Without Human*, *Escalated to Human*, *Soft Deflections (Stock Notify)*, and overall *Deflection Rate %*.
  - Persistence across reloads using `localStorage`.
- **Honest Conscience-Compass Guardrails**:
  - Stock lookups explicitly disclose mock status and offer a "Notify Me" restock alert logged as a *Soft Deflection*.
  - Damaged items, wrong shipments, or explicit requests (*"agent"*, *"human"*) immediately trigger escalation to a human support ticket (`#TKT-XXXXXX`).

---
