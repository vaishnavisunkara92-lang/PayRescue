# PayRescue

## AI-Powered Payment Recovery and Decision-Support System

PayRescue is an AI-powered payment recovery and decision-support system designed to help businesses understand failed digital payments, identify valuable recovery opportunities, and execute controlled recovery actions.

Instead of treating every failed payment in the same way, PayRescue analyzes the payment amount, customer type, and failure reason to generate an explainable recovery score, assign a priority, and recommend an appropriate recovery strategy.

The system goes beyond simple retry logic by combining **failure diagnosis, recovery prioritization, incident detection, revenue-at-risk analysis, safety guardrails, human approval, controlled recovery, verification, learning, and analytics** into one workflow.

PayRescue is being developed for the **Razorpay AI Buildathon 2026**.

---

## The Problem

Failed payments are a major challenge in digital payments.

A payment failure does not always mean that the payment opportunity is lost. Different failures require different responses.

For example:

* An insufficient-funds failure may become successful after the customer adds funds.
* A network error may be recoverable through a controlled retry.
* A timeout may require another attempt.
* A card decline may require an alternative payment method.

If every failed payment is handled using the same strategy, businesses can:

* Miss valuable recovery opportunities
* Waste resources on low-value payments
* Retry payments unnecessarily
* Increase operational risk
* Provide a poor customer experience
* Fail to detect larger payment incidents
* Have limited visibility into revenue at risk
* Find it difficult to understand why a recovery decision was made

PayRescue addresses this problem by turning payment failures into **prioritized, explainable, and safety-aware recovery decisions**.

---

# Our Approach

PayRescue follows a complete payment recovery lifecycle:

**Failed Payment → Diagnosis → Explainable AI Reasoning → Recovery Score → Priority → Incident Detection → Revenue at Risk → Safety Checks → Human Approval → Recovery → Verification → Learning → Analytics**

The system is designed around an important principle:

> **Not every failed payment should be retried automatically.**

The recovery decision depends on the failure type, payment value, customer type, recovery opportunity, and safety conditions.

---

# Key Features

## 1. Failed Payment Recording

PayRescue records important payment information including:

* Payment ID
* Payment amount
* Payment status
* Failure reason
* Customer type
* Creation timestamp
* Diagnosis
* Recovery score
* Priority
* Recommended recovery action
* Recovery status
* Verification status
* Learning result
* AI explanation
* Notification status

Payment information is stored locally using SQLite.

---

## 2. Failure Diagnosis

PayRescue converts technical payment failure reasons into understandable explanations.

Currently supported failure reasons include:

* `insufficient_funds`
* `card_declined`
* `network_error`
* `timeout`

For example:

```text
insufficient_funds
```

is converted into a human-readable diagnosis such as:

```text
Customer has insufficient funds
```

This makes technical payment failures easier for operators to understand.

---

## 3. Explainable AI Decision Engine

The current implementation uses an **explainable rule-based decision engine**.

It does not claim to be a trained machine-learning model.

The engine evaluates:

* Payment amount
* Customer type
* Failure reason

It then generates:

* Recovery score
* Priority
* Recommended action
* Human-readable explanation

This makes the recovery decision transparent instead of presenting an unexplained score.

---

# Recovery Scoring

The current scoring system uses three major factors.

## Payment Amount

| Payment Amount | Score |
| -------------- | ----: |
| ₹5000 or more  |   +40 |
| ₹2000 to ₹4999 |   +25 |
| Below ₹2000    |   +10 |

## Customer Type

| Customer Type | Score |
| ------------- | ----: |
| Premium       |   +30 |
| Regular       |   +10 |

## Failure Reason

| Failure Reason     | Score |
| ------------------ | ----: |
| Insufficient funds |   +20 |
| Network error      |   +15 |
| Timeout            |   +15 |
| Card declined      |    +5 |

---

# Priority Classification

The final recovery score determines the payment priority.

| Recovery Score | Priority |
| -------------- | -------- |
| 80 or above    | High     |
| 50–79          | Medium   |
| Below 50       | Low      |

This allows operators to focus attention on the most important recovery opportunities first.

---

# Recovery Strategy

PayRescue does not use the same recovery action for every payment failure.

| Failure Reason     | Recommended Action                         |
| ------------------ | ------------------------------------------ |
| Insufficient funds | Retry after customer adds funds            |
| Network error      | Retry payment                              |
| Timeout            | Retry payment                              |
| Card declined      | Ask customer to use another payment method |
| Other              | Manual review                              |

This creates a more targeted recovery workflow.

---

# Incident Command Center

PayRescue can group failed payments by failure reason to identify potential payment incidents.

The Incident Command Center provides visibility into:

* Incident type
* Number of affected payments
* Total affected amount
* Incident severity
* Revenue at risk
* Operational impact

Incident severity is calculated using the number of affected payments and the associated failed amount.

The system can classify incidents as:

* Critical
* High
* Medium
* Low

This allows operators to identify when multiple payment failures may represent a larger operational problem rather than isolated failures.

---

# Revenue at Risk

PayRescue calculates the amount of failed payment value currently exposed to recovery risk.

The dashboard surfaces:

**Revenue at Risk**

This helps shift the focus from simply counting failed payments to understanding their potential business impact.

For example, two incidents may contain the same number of failed payments but have very different financial importance.

---

# Recovery Operations Queue

The Recovery Operations Queue provides an operational view of payments that require recovery attention.

Payments can be prioritized based on:

* Recovery score
* Priority
* Failure reason
* Recovery status
* Safety conditions
* Approval requirements

This gives operators a centralized view of recovery opportunities.

---

# Safety Layer

A key feature of PayRescue is that recovery is not allowed to operate without safety controls.

The backend implements several recovery safety mechanisms.

## Maximum Recovery Attempts

The system limits the number of recovery attempts for a payment.

Current limit:

```text
Maximum recovery attempts = 3
```

This helps prevent uncontrolled retry loops.

---

## Retry Cooldown

A cooldown period is applied between recovery attempts.

Current configuration:

```text
Retry cooldown = 30 seconds
```

This prevents immediate repeated recovery attempts.

---

## Idempotency Protection

PayRescue prevents a payment that has already completed recovery from being processed again unnecessarily.

This helps avoid duplicate recovery operations.

For example:

```text
Already recovered
```

is returned when a completed recovery is attempted again.

---

# Autonomous Exposure Cap

PayRescue includes an autonomous recovery exposure limit.

Current configuration:

```text
Autonomous exposure cap = ₹10,000
```

If a payment exceeds this amount, the system does not automatically perform recovery.

Instead, it requires human approval.

Example:

```text
Payment Amount: ₹12,000

Result:
APPROVAL_REQUIRED
```

This creates a safety boundary between automated recovery and higher-value recovery decisions.

---

# Human-in-the-Loop Approval

High-risk or high-value recovery operations can require explicit human approval.

The approval workflow is:

**Recovery Request → Safety Check → Approval Required → Human Approval → Recovery**

This prevents the system from automatically executing sensitive recovery operations without operator authorization.

The backend provides:

```text
POST /approve-recovery/{payment_id}
```

After approval, the payment can proceed through the recovery workflow.

---

# Circuit Breaker

PayRescue includes a circuit breaker designed to protect recovery operations when repeated recovery failures occur.

The circuit breaker supports:

* `CLOSED`
* `OPEN`
* `HALF-OPEN`

Current configuration includes:

```text
Failure threshold = 3
Failure window = 300 seconds
```

The circuit breaker provides an additional safety boundary for automated recovery operations.

The current circuit breaker state can be monitored through the safety API.

---

# Safety Status

The system exposes a safety monitoring endpoint:

```text
GET /safety-status
```

It provides information such as:

* Overall safety status
* Circuit breaker state
* Failure threshold
* Recent recovery failures
* Failure window
* Retry cooldown
* Maximum recovery attempts
* Autonomous exposure cap

Example configuration:

```text
Status: SAFE
Circuit Breaker: CLOSED
Max Recovery Attempts: 3
Autonomous Exposure Cap: ₹10,000
Retry Cooldown: 30 seconds
```

This provides operational visibility into the current recovery safety state.

---

# Recovery Simulation

PayRescue supports simulated recovery actions without requiring real financial transactions.

Example:

```text
Recovery attempt initiated
```

Other possible simulated outcomes include:

```text
Customer notified to use another payment method
```

or:

```text
Payment sent for manual recovery
```

The simulation allows the complete recovery lifecycle to be demonstrated safely.

---

# Verification

After recovery, PayRescue records the verification state.

Possible states include:

```text
Recovery pending verification
```

```text
Waiting for customer to retry
```

```text
Manual recovery pending
```

This allows the system to track what happens after the recovery action.

---

# Learning Result

PayRescue records the outcome of the recovery strategy.

For example:

```text
Recovery strategy recorded for future optimization
```

This creates a foundation for future data-driven optimization.

Historical recovery outcomes could eventually be used to train models that predict recovery probability and recommend the most effective strategy.

---

# Simulated WhatsApp Notification

PayRescue includes a simulated customer notification workflow.

Example:

```text
⚠️ Your payment of ₹3000 timed out.
Please try the payment again.
```

The notification system records:

* Channel
* Mode
* Status
* Message
* Recommended action

This is a **simulation only** and does not connect to the real WhatsApp API.

---

# Razorpay Test Payment Simulator

PayRescue includes a test payment simulator for demonstrating different payment outcomes.

The simulator can represent scenarios such as:

* Successful payment
* Insufficient funds
* Card declined
* Network error
* Timeout

This allows the recovery workflow to be demonstrated without processing real payments.

The simulator is intended for development and demonstration purposes.

---

# Dashboard

The React dashboard provides a centralized operational view.

The dashboard includes:

* Total failed payments
* Total failed amount
* High-priority payments
* Recovery rate
* Failure breakdown
* Priority breakdown
* Revenue at risk
* Incident Command Center
* Recovery Operations Queue
* Recent failed payments
* Payment analysis
* Recovery controls
* Safety controls
* Razorpay test simulator
* Simulated payment method information

---

# Payment Analysis

When a payment is selected for analysis, the dashboard can display:

* Payment ID
* Diagnosis
* Recovery Score
* Priority
* Recovery Action
* Recovery Status
* Verification Status
* Learning Result
* AI Explanation

This provides operators with both the decision and the reasoning behind it.

---

# Example

Suppose a payment contains:

```text
Payment ID: PAY022
Amount: ₹8000
Customer Type: Premium
Failure Reason: insufficient_funds
```

The recovery score is calculated as:

```text
Amount points        = +40
Customer points      = +30
Failure reason       = +20
--------------------------------
Recovery Score       = 90
Priority             = High
```

The system recommends:

```text
Retry payment after the customer adds funds
```

If the payment is subject to a safety restriction, the system can require human approval before recovery.

This demonstrates how PayRescue converts raw payment failure information into a structured and explainable recovery decision.

---

# Complete System Workflow

The PayRescue lifecycle is:

### Step 1 — Payment Failure

A payment fails.

### Step 2 — Diagnosis

The system identifies and explains the failure reason.

### Step 3 — Recovery Scoring

The system evaluates the payment amount, customer type, and failure reason.

### Step 4 — Priority Assignment

The payment is classified as High, Medium, or Low priority.

### Step 5 — Incident Detection

Related failures can be grouped to identify potential incidents.

### Step 6 — Revenue Risk Analysis

The system calculates the financial value currently at risk.

### Step 7 — Safety Evaluation

The system checks:

* Retry limits
* Cooldown
* Idempotency
* Exposure limits
* Circuit breaker state
* Approval requirements

### Step 8 — Human Approval

Higher-risk recovery operations can require explicit operator approval.

### Step 9 — Recovery

The approved recovery action is simulated and recorded.

### Step 10 — Verification

The recovery state is tracked.

### Step 11 — Learning

The recovery outcome is recorded.

### Step 12 — Analytics

Dashboard metrics are updated to provide operational visibility.

---

# Technology Stack

## Backend

* Python
* FastAPI
* Uvicorn
* Pydantic
* SQLite

## Frontend

* React
* Vite
* JavaScript
* CSS

## Development Tools

* Visual Studio Code
* Git
* GitHub

---

# Project Architecture

## Project Architecture

The following architecture shows how the major PayRescue components work together.

![PayRescue System Architecture](architecture.png)

### Architecture Flow

**User/Operator → React Dashboard → FastAPI Backend → Explainable Decision Engine → Safety & Recovery Controls → SQLite Database**

The system also includes incident intelligence, revenue-at-risk analysis, recovery verification, learning results, and simulated payment and notification integrations.
---![architecture]](image.png)

# Backend API

The main backend endpoints include:

| Method | Endpoint                         | Purpose                            |
| ------ | -------------------------------- | ---------------------------------- |
| GET    | `/`                              | Check whether PayRescue is running |
| POST   | `/payments`                      | Record a payment                   |
| GET    | `/payments`                      | Retrieve stored payments           |
| GET    | `/analytics`                     | Retrieve dashboard analytics       |
| POST   | `/recover/{payment_id}`          | Start recovery                     |
| POST   | `/approve-recovery/{payment_id}` | Approve recovery                   |
| GET    | `/safety-status`                 | View recovery safety status        |
| GET    | `/circuit-breaker`               | View circuit breaker state         |
| POST   | `/circuit-breaker/{state}`       | Control circuit breaker            |
| POST   | `/razorpay-test/simulate`        | Simulate payment scenarios         |

The APIs can be tested through the FastAPI Swagger interface.

---

# Running the Backend

Open **CMD** and navigate to the backend folder:

```cmd
cd /d C:\Users\vaishnavi\OneDrive\Documents\PayRescue\backend
```

Activate the virtual environment:

```cmd
venv\Scripts\activate
```

Start the FastAPI server:

```cmd
uvicorn main:app --reload
```

The backend runs at:

```text
http://127.0.0.1:8000
```

Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

---

# Running the Frontend

Open a **second CMD window**.

Navigate to the frontend folder:

```cmd
cd /d C:\Users\vaishnavi\OneDrive\Documents\PayRescue\frontend
```

Start the Vite development server:

```cmd
npm.cmd run dev
```

The frontend normally runs at:

```text
http://localhost:5173/
```

If port `5173` is already in use, Vite may automatically select another port such as:

```text
http://localhost:5174/
```

Use the URL displayed by Vite in the terminal.

---

# Example API Request

A failed payment can be recorded using:

```bash
curl -X POST \
  "http://127.0.0.1:8000/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": "PAY001",
    "amount": 2500,
    "status": "failed",
    "failure_reason": "insufficient_funds",
    "customer_type": "regular"
  }'
```

The backend then diagnoses the payment and calculates its recovery score and priority.

---

# Safety-First Recovery Philosophy

PayRescue is designed around the principle:

> **Automation should be controlled by safety boundaries.**

The system therefore does not assume that every failed payment should automatically be retried.

Instead, it evaluates:

```text
Can this payment be recovered?
        ↓
Is recovery valuable?
        ↓
Is the recommended action appropriate?
        ↓
Is automated recovery safe?
        ↓
Does human approval need to be involved?
        ↓
Execute controlled recovery
```

This makes the system more suitable for demonstrating responsible AI-assisted financial operations.

---

# Current Project Status

The core PayRescue system has been implemented and tested.

Currently available:

* Failed payment recording
* SQLite persistence
* Failure diagnosis
* Explainable recovery scoring
* Priority assignment
* Recovery action recommendation
* Incident detection
* Revenue-at-risk analysis
* Recovery Operations Queue
* Recovery simulation
* Recovery verification
* Learning result recording
* Explainable AI reasoning
* Human approval workflow
* Autonomous exposure cap
* Maximum recovery attempts
* Retry cooldown
* Idempotency protection
* Circuit breaker
* Safety status monitoring
* Razorpay test payment simulator
* Simulated WhatsApp notifications
* Analytics dashboard
* React frontend
* FastAPI backend
* Backend/frontend integration
* Git version control
* GitHub repository

The current version demonstrates an end-to-end payment recovery decision-support workflow using an explainable rule-based AI engine and safety-aware recovery controls.

---

# Future Enhancements

## Machine Learning

A future version can train machine-learning models using historical payment and recovery outcomes.

The model could estimate:

```text
Probability of successful recovery
```

and help rank recovery strategies.

---

## Smarter Strategy Selection

Instead of selecting one recovery action using predefined rules, future versions could compare multiple strategies and select the one with the highest expected recovery value.

---

## Customer Segmentation

Recovery strategies could be personalized using historical customer payment behavior.

---

## Advanced Incident Detection

Future versions could use real-time statistical baselines to detect unusual spikes in payment failures and identify emerging incidents earlier.

---

## Real Payment Gateway Integration

The simulator could eventually be connected to a controlled payment gateway test environment.

Real-money processing is outside the scope of the current demonstration.

---

## Real Notifications

The simulated notification layer could eventually integrate with approved email, SMS, or messaging providers.

---

## Advanced Analytics

Future dashboards could include:

* Recovery probability
* Recovery amount
* Failure trends
* Incident trends
* Payment rail performance
* Strategy effectiveness
* Customer recovery behavior

---

# Why PayRescue?

PayRescue focuses on a simple but important idea:

> **A failed payment should not always be treated as a lost payment.**

The system transforms payment failures into structured recovery decisions.

Instead of blindly retrying every failed payment, PayRescue:

**Understands → Prioritizes → Protects → Recovers → Verifies → Learns**

This helps demonstrate how AI-assisted decision support can be combined with safety controls to improve payment recovery operations.

---

# Buildathon

PayRescue is being developed for the:

**Razorpay AI Buildathon 2026**

The project explores how explainable AI decision support, recovery optimization, incident awareness, and safety-aware automation can be applied to digital payment recovery.

The current implementation is a **simulation and decision-support system** and does not process real customer payments.

---

# Author

**Vaishnavi Sunkara**

**PayRescue — AI-Powered Payment Recovery and Decision-Support System**
