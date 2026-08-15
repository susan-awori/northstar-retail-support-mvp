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
## 2. What is Simulated / Mocked for Demo Purposes

To deliver a self-contained, zero-dependency client-side MVP, the following components are currently simulated:

| Component | MVP Implementation | Production Risk if Unchanged |
| :--- | :--- | :--- |
| **Data Layer** | Local static JSON file ([`mockData.json`](file:///c:/Users/user/OneDrive/Desktop/Northstart/mockData.json)) | Out-of-date data, security exposure if raw JSON exposed on public web server. |
| **Authentication** | Simulated customer dropdown switching `currentCustomer` session variable | Zero security/auth verification. Anyone can view mock orders. |
| **RAG Indexing** | In-browser keyword matching over static `.md` text chunks | Scalability limits; cannot process complex semantic search or synonyms. |
| **Analytics** | In-browser `localStorage` counter state | Deflection metrics exist only per user browser session, not globally. |

---
## 3. Phase 2 Real Data Integration Requirements (Production Roadmap)

Before deploying this widget to production on `www.northstarretail.com`, Northstar's engineering team must complete the following 5 integration steps:

### 🔒 3.1 Backend API Layer & Database Decoupling
> [!CAUTION]
> **Never connect the frontend widget directly to database credentials or raw DB connections.**

- Create an isolated, authenticated backend API gateway (e.g., `GET /api/v1/orders/:id`, `POST /api/v1/returns/initiate`).
- The bot frontend will issue HTTP requests to Northstar's API gateway using short-lived OAuth2 / JWT access tokens.
- Implement rate limiting (e.g., 10 lookup requests per minute per IP/user) to prevent brute-force order scraping.

### 🔑 3.2 Production Identity & Auth Integration
- Replace the simulated customer dropdown with Northstar's production identity provider (e.g., Auth0, Supabase Auth, or custom session cookies).
- When a customer logs into Northstar Retail Co., pass their encrypted session token to the widget initialization script (`NorthstarWidget.init({ token: userToken })`).
- Unauthenticated guest users must complete email verification (OTP or order number + email check) before order details are displayed.

### 🧠 3.3 Automated Vector Store RAG Sync Pipeline
Replace the static `rag.js` keyword matcher with a production-grade semantic Vector RAG pipeline:
```
[Northstar Help Center / CMS] 
          │ (Webhooks on policy edit)
          ▼
[Text Embedding Model (OpenAI text-embedding-3 / Claude API)]
          │ (Generate 1536-dim vector embeddings)
          ▼
[Vector Database (Pinecone / PGVector / Qdrant)]
          │ (Vector Similarity Search cosine/dot-product)
          ▼
[LLM Generation Layer with Guardrails]
```
- **Automated Re-Indexing**: Configure CMS webhooks so that whenever Northstar updates policy pages, the vector store automatically updates embeddings.
- **Strict Prompt Scoping**: Instruct the LLM to restrict answers *only* to context retrieved from the vector database.
