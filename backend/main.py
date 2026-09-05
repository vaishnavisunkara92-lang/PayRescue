from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import sqlite3
import json


# =========================================================
# DATABASE
# =========================================================

def get_db_connection():
    conn = sqlite3.connect("payrescue.db")
    conn.row_factory = sqlite3.Row
    return conn


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(title="PayRescue API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DATABASE TABLE SETUP
# =========================================================

def initialize_database():
    conn = get_db_connection()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS incidents (
            incident_id TEXT PRIMARY KEY,
            failure_reason TEXT,
            payment_count INTEGER,
            total_failed_amount REAL,
            severity TEXT,
            revenue_at_risk REAL,
            recovery_strategy TEXT,
            created_at TEXT
        )
        """
    )

    # Add recovery_attempts only if it does not already exist.
    # This keeps the existing database safe.
    columns = conn.execute(
        "PRAGMA table_info(payments)"
    ).fetchall()

    column_names = [column["name"] for column in columns]

    if columns and "recovery_attempts" not in column_names:
        conn.execute(
            """
            ALTER TABLE payments
            ADD COLUMN recovery_attempts INTEGER DEFAULT 0
            """
        )

    # Add retry timestamp only if it does not already exist.
    # This keeps the existing database safe and preserves all existing data.
    if columns and "recovery_last_attempt_at" not in column_names:
        conn.execute(
            """
            ALTER TABLE payments
            ADD COLUMN recovery_last_attempt_at TEXT
            """
        )

    conn.commit()
    conn.close()


initialize_database()


# =========================================================
# PAYMENT MODEL
# =========================================================

class Payment(BaseModel):
    payment_id: str
    amount: float
    status: str
    failure_reason: str | None = None
    customer_type: str = "regular"


payments = []

# =========================
# CIRCUIT BREAKER + RECOVERY SAFETY
# =========================

CIRCUIT_BREAKER_STATE = "CLOSED"

CIRCUIT_BREAKER_CONFIG = {
    "failure_threshold": 3,
    "failure_window_seconds": 300,
    "test_mode": False
}

RECOVERY_COOLDOWN_SECONDS = 30
MAX_RECOVERY_ATTEMPTS = 3
AUTONOMOUS_EXPOSURE_CAP = 10000
recovery_failure_events = []
# =========================================================
# AUTONOMOUS EXPOSURE SAFETY
# =========================================================

AUTONOMOUS_EXPOSURE_CAP = 10000

def _cleanup_recovery_failure_events():
    """Keep only recent recovery failure events inside the safety window."""
    global recovery_failure_events

    now = datetime.now().timestamp()
    window = CIRCUIT_BREAKER_CONFIG["failure_window_seconds"]

    recovery_failure_events = [
        event_time
        for event_time in recovery_failure_events
        if now - event_time <= window
    ]


def record_recovery_failure():
    """Record a real recovery failure and automatically open the breaker."""
    global CIRCUIT_BREAKER_STATE

    _cleanup_recovery_failure_events()
    recovery_failure_events.append(datetime.now().timestamp())

    if len(recovery_failure_events) >= CIRCUIT_BREAKER_CONFIG["failure_threshold"]:
        CIRCUIT_BREAKER_STATE = "OPEN"


def get_circuit_breaker_status():
    _cleanup_recovery_failure_events()

    return {
        "state": CIRCUIT_BREAKER_STATE,
        "failure_threshold": CIRCUIT_BREAKER_CONFIG["failure_threshold"],
        "recent_recovery_failures": len(recovery_failure_events),
        "failure_window_seconds": CIRCUIT_BREAKER_CONFIG["failure_window_seconds"],
        "message": (
            "Recovery operations are normal."
            if CIRCUIT_BREAKER_STATE == "CLOSED"
            else
            "Recovery operations are temporarily blocked for safety."
            if CIRCUIT_BREAKER_STATE == "OPEN"
            else
            "Test recovery is allowed before normal recovery resumes."
        )
    }


def set_circuit_breaker_state(state):
    global CIRCUIT_BREAKER_STATE

    if state in ["CLOSED", "OPEN", "HALF-OPEN"]:
        CIRCUIT_BREAKER_STATE = state

        # Closing the breaker starts a fresh safety window.
        if state == "CLOSED":
            recovery_failure_events.clear()

    return get_circuit_breaker_status()


def get_cooldown_status(last_attempt_at):
    """Return retry cooldown information for a payment."""
    if not last_attempt_at:
        return {
            "active": False,
            "remaining_seconds": 0,
            "message": "No active retry cooldown"
        }

    try:
        last_attempt = datetime.fromisoformat(last_attempt_at)
        elapsed = (datetime.now() - last_attempt).total_seconds()
        remaining = max(0, int(RECOVERY_COOLDOWN_SECONDS - elapsed))

        return {
            "active": remaining > 0,
            "remaining_seconds": remaining,
            "message": (
                f"Retry cooldown active. Try again in {remaining} seconds."
                if remaining > 0
                else "Retry cooldown completed."
            )
        }
    except (ValueError, TypeError):
        return {
            "active": False,
            "remaining_seconds": 0,
            "message": "No active retry cooldown"
        }


@app.get("/circuit-breaker")
def circuit_breaker():
    return get_circuit_breaker_status()


@app.post("/circuit-breaker/{state}")
def change_circuit_breaker(state: str):
    return set_circuit_breaker_state(state.upper())


@app.get("/safety-status")
def safety_status():
    """Dashboard-friendly overview of the PayRescue safety layer."""

    return {
        "status": (
            "SAFE"
            if CIRCUIT_BREAKER_STATE == "CLOSED"
            else "CIRCUIT OPEN"
            if CIRCUIT_BREAKER_STATE == "OPEN"
            else "TEST MODE"
        ),
        "circuit_breaker": get_circuit_breaker_status(),

        # Recovery safety controls
        "retry_cooldown_seconds": RECOVERY_COOLDOWN_SECONDS,
        "max_recovery_attempts": MAX_RECOVERY_ATTEMPTS,
        "autonomous_exposure_cap": AUTONOMOUS_EXPOSURE_CAP,

        "message": (
            "Automated recovery is operating normally."
            if CIRCUIT_BREAKER_STATE == "CLOSED"
            else
            "Automated recovery is paused until the circuit is safely closed."
            if CIRCUIT_BREAKER_STATE == "OPEN"
            else
            "Only controlled test recovery is allowed."
        )
    }

# =========================================================
# FAILURE DIAGNOSIS
# =========================================================

def diagnose_failure(failure_reason):
    if failure_reason == "insufficient_funds":
        return "Customer has insufficient funds"

    elif failure_reason == "card_declined":
        return "Card was declined"

    elif failure_reason == "network_error":
        return "Payment failed due to a network issue"

    elif failure_reason == "timeout":
        return "Payment request timed out"

    else:
        return "Unknown payment failure"


# =========================================================
# RECOVERY SCORE
# =========================================================

def calculate_recovery_score(amount, customer_type, failure_reason):
    score = 0

    if amount >= 5000:
        score += 40

    elif amount >= 2000:
        score += 25

    else:
        score += 10

    if customer_type == "premium":
        score += 30

    else:
        score += 10

    if failure_reason == "insufficient_funds":
        score += 20

    elif failure_reason == "network_error":
        score += 15

    elif failure_reason == "timeout":
        score += 15

    elif failure_reason == "card_declined":
        score += 5

    return score


# =========================================================
# PRIORITY
# =========================================================

def get_priority(recovery_score):
    if recovery_score >= 80:
        return "High"

    elif recovery_score >= 50:
        return "Medium"

    else:
        return "Low"


# =========================================================
# AI EXPLANATION
# =========================================================

def explain_recovery_decision(
    amount,
    customer_type,
    failure_reason,
    recovery_score,
    priority
):
    reasons = []

    if amount >= 5000:
        reasons.append("High payment amount")

    elif amount >= 2000:
        reasons.append("Medium payment amount")

    else:
        reasons.append("Low payment amount")

    if customer_type == "premium":
        reasons.append("Premium customer")

    else:
        reasons.append("Regular customer")

    if failure_reason == "insufficient_funds":
        reasons.append(
            "Insufficient funds can often be recovered after adding funds"
        )

    elif failure_reason == "network_error":
        reasons.append(
            "Network errors can often be recovered by retrying"
        )

    elif failure_reason == "timeout":
        reasons.append(
            "Timeout failures can often be recovered by retrying"
        )

    elif failure_reason == "card_declined":
        reasons.append(
            "Card decline requires an alternative payment method"
        )

    else:
        reasons.append("Unknown failure reason")

    return {
        "explanation": reasons,
        "decision": f"{priority} priority with recovery score {recovery_score}"
    }


# =========================================================
# RECOVERY ACTION
# =========================================================

def decide_recovery_action(failure_reason, priority):
    if failure_reason == "insufficient_funds":
        return "Retry payment after customer adds funds"

    elif failure_reason == "network_error":
        return "Retry payment immediately"

    elif failure_reason == "timeout":
        return "Retry payment"

    elif failure_reason == "card_declined":
        return "Ask customer to use another payment method"

    else:
        return "Manual review required"


# =========================================================
# SIMULATE RECOVERY
# =========================================================

def simulate_recovery(recovery_action):
    if "Retry payment" in recovery_action:
        return "Recovery attempt initiated"

    elif "Ask customer" in recovery_action:
        return "Customer notified to use another payment method"

    else:
        return "Payment sent for manual recovery"


# =========================================================
# VERIFY RECOVERY
# =========================================================

def verify_recovery(recovery_status):
    if recovery_status == "Recovery attempt initiated":
        return "Recovery pending verification"

    elif recovery_status == "Customer notified to use another payment method":
        return "Waiting for customer to retry"

    else:
        return "Manual recovery pending"


# =========================================================
# LEARNING
# =========================================================

def learn_from_payment(payment_data):
    if payment_data["recovery_status"] == "Recovery attempt initiated":
        return "Recovery strategy recorded for future optimization"

    elif payment_data["recovery_status"] == "Customer notified to use another payment method":
        return "Alternative payment strategy recorded"

    else:
        return "Manual recovery case recorded"


# =========================================================
# SIMULATED WHATSAPP NOTIFICATION
# =========================================================

def generate_whatsapp_notification(payment_data):
    amount = payment_data["amount"]
    failure_reason = payment_data["failure_reason"]
    recovery_action = payment_data["recovery_action"]

    if failure_reason == "insufficient_funds":
        message = (
            f"⚠️ Your payment of ₹{amount:.0f} failed due to insufficient "
            "funds. Please add funds and retry the payment."
        )

    elif failure_reason == "network_error":
        message = (
            f"⚠️ Your payment of ₹{amount:.0f} failed due to a temporary "
            "network issue. Please retry the payment."
        )

    elif failure_reason == "timeout":
        message = (
            f"⚠️ Your payment of ₹{amount:.0f} timed out. "
            "Please try the payment again."
        )

    elif failure_reason == "card_declined":
        message = (
            f"⚠️ Your payment of ₹{amount:.0f} was declined. "
            "Please use another payment method."
        )

    else:
        message = (
            f"⚠️ Your payment of ₹{amount:.0f} could not be completed. "
            "Please try another payment method."
        )

    return {
        "channel": "WhatsApp",
        "mode": "Simulated",
        "status": "Notification generated",
        "message": message,
        "recommended_action": recovery_action
    }


# =========================================================
# ADD PAYMENT
# =========================================================

@app.post("/payments")
def add_payment(payment: Payment):

    payment_data = payment.model_dump()

    payment_data["created_at"] = datetime.now().isoformat()

    payment_data["diagnosis"] = diagnose_failure(
        payment.failure_reason
    )

    payment_data["recovery_score"] = calculate_recovery_score(
        payment.amount,
        payment.customer_type,
        payment.failure_reason
    )

    payment_data["priority"] = get_priority(
        payment_data["recovery_score"]
    )

    payment_data["recovery_action"] = decide_recovery_action(
        payment.failure_reason,
        payment_data["priority"]
    )

    payment_data["recovery_status"] = simulate_recovery(
        payment_data["recovery_action"]
    )

    payment_data["verification_status"] = verify_recovery(
        payment_data["recovery_status"]
    )

    payment_data["learning_result"] = learn_from_payment(
        payment_data
    )

    payment_data["ai_explanation"] = explain_recovery_decision(
        payment.amount,
        payment.customer_type,
        payment.failure_reason,
        payment_data["recovery_score"],
        payment_data["priority"]
    )

    payment_data["whatsapp_notification"] = (
        generate_whatsapp_notification(payment_data)
    )

    conn = get_db_connection()

    conn.execute(
        """
        INSERT INTO payments (
            payment_id,
            amount,
            status,
            failure_reason,
            customer_type,
            created_at,
            diagnosis,
            recovery_score,
            priority,
            recovery_action,
            recovery_status,
            verification_status,
            learning_result,
            ai_explanation,
            whatsapp_notification
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payment_data["payment_id"],
            payment_data["amount"],
            payment_data["status"],
            payment_data["failure_reason"],
            payment_data["customer_type"],
            payment_data["created_at"],
            payment_data["diagnosis"],
            payment_data["recovery_score"],
            payment_data["priority"],
            payment_data["recovery_action"],
            payment_data["recovery_status"],
            payment_data["verification_status"],
            payment_data["learning_result"],
            json.dumps(payment_data["ai_explanation"]),
            json.dumps(payment_data["whatsapp_notification"])
        )
    )

    conn.commit()
    conn.close()

    payments.append(payment_data)

    return {
        "message": "Payment recorded successfully",
        "payment": payment_data
    }


# =========================================================
# GET PAYMENTS
# =========================================================

@app.get("/payments")
def get_payments():

    conn = get_db_connection()

    rows = conn.execute(
        "SELECT * FROM payments ORDER BY created_at DESC"
    ).fetchall()

    conn.close()

    payments_data = [dict(row) for row in rows]

    for payment in payments_data:

        if payment["ai_explanation"]:

            try:
                payment["ai_explanation"] = json.loads(
                    payment["ai_explanation"]
                )

            except:
                payment["ai_explanation"] = {
                    "explanation": [payment["ai_explanation"]],
                    "decision": ""
                }

        if payment["whatsapp_notification"]:

            try:
                payment["whatsapp_notification"] = json.loads(
                    payment["whatsapp_notification"]
                )

            except:
                pass

    return {
        "total_payments": len(payments_data),
        "payments": payments_data
    }


# =========================================================
# RECOVER PAYMENT
# =========================================================

@app.post("/recover/{payment_id}")
def recover_payment(payment_id: str):

    MAX_RECOVERY_ATTEMPTS = 3

    conn = get_db_connection()

    payment = conn.execute(
        "SELECT * FROM payments WHERE payment_id = ?",
        (payment_id,)
    ).fetchone()

    # Circuit breaker safety check
    if CIRCUIT_BREAKER_STATE == "OPEN":
     return {
        "status": "BLOCKED",
        "message": "Recovery blocked by Circuit Breaker.",
        "circuit_breaker": "OPEN"
    }
    if CIRCUIT_BREAKER_STATE == "HALF-OPEN":
     return {
        "status": "TEST_REQUIRED",
        "message": "Circuit Breaker is HALF-OPEN. Test recovery is required before normal recovery resumes.",
        "circuit_breaker": "HALF-OPEN"
    }

    # =====================================================
    # PAYMENT EXISTENCE CHECK
    # =====================================================

    if payment is None:
        conn.close()

        return {
            "message": "Payment not found"
        }

    current_attempts = payment["recovery_attempts"] or 0

        # =====================================================
    # AUTONOMOUS EXPOSURE CAP CHECK
    # =====================================================

    if (
        payment["amount"] > AUTONOMOUS_EXPOSURE_CAP
        and payment["recovery_status"] != "Recovery approved"
    ):
        conn.close()

        return {
            "message": "Autonomous recovery blocked by exposure safety limit",
            "status": "APPROVAL_REQUIRED",
            "reason": "Payment amount exceeds autonomous exposure cap",
            "payment_id": payment_id,
            "amount": payment["amount"],
            "autonomous_exposure_cap": AUTONOMOUS_EXPOSURE_CAP,
            "safety_status": "HUMAN_APPROVAL_REQUIRED"
        }

    # =====================================================
    # IDEMPOTENCY CHECK
    # =====================================================

    if payment["recovery_status"] == "Recovery successful":

        conn.close()

        return {
            "message": "Payment already recovered",
            "status": "Already recovered",
            "recovery_attempts": current_attempts
        }

    # =====================================================
    # RETRY COOLDOWN CHECK
    # =====================================================

    cooldown = get_cooldown_status(payment["recovery_last_attempt_at"])

    if cooldown["active"]:
        conn.close()

        return {
            "message": "Recovery temporarily blocked by retry cooldown",
            "status": "COOLDOWN",
            "reason": cooldown["message"],
            "remaining_seconds": cooldown["remaining_seconds"],
            "cooldown_seconds": RECOVERY_COOLDOWN_SECONDS,
            "recovery_attempts": current_attempts
        }

    # =====================================================
    # RETRY LIMIT CHECK
    # =====================================================

    if current_attempts >= MAX_RECOVERY_ATTEMPTS:

        conn.execute(
            """
            UPDATE payments
            SET recovery_status = ?,
                verification_status = ?,
                learning_result = ?
            WHERE payment_id = ?
            """,
            (
                "Recovery blocked",
                "Manual review required",
                "Recovery blocked because maximum retry limit was reached",
                payment_id
            )
        )

        conn.commit()
        conn.close()

        return {
            "message": "Recovery blocked",
            "status": "BLOCKED",
            "reason": "Maximum recovery attempts reached",
            "max_attempts": MAX_RECOVERY_ATTEMPTS,
            "recovery_attempts": current_attempts,
            "safety_status": "RECOVERY BLOCKED"
        }
        # =====================================================
    # HUMAN-IN-THE-LOOP APPROVAL CHECK
    # =====================================================

    if (
    payment["priority"] == "High"
    and payment["recovery_status"] != "Recovery approved"
):

        conn.close()

        return {
            "message": "Human approval required before recovery",
            "status": "APPROVAL_REQUIRED",
            "priority": "High",
            "payment_id": payment_id
        }

    # =====================================================
    # ELIGIBILITY CHECK
    # =====================================================

    if payment["recovery_status"] not in [
    "Recovery attempt initiated",
    "Recovery approved"
]:

        conn.close()

        return {
            "message": "Payment is not eligible for recovery",
            "recovery_attempts": current_attempts
        }

    # =====================================================
    # RECORD RECOVERY ATTEMPT
    # =====================================================

    new_attempt_count = current_attempts + 1

    conn.execute(
        """
        UPDATE payments
        SET recovery_attempts = ?,
            recovery_status = ?,
            verification_status = ?,
            learning_result = ?,
            recovery_last_attempt_at = ?
        WHERE payment_id = ?
        """,
        (
            new_attempt_count,
            "Recovery successful",
            "Payment recovered successfully",
            "Successful recovery recorded for future optimization",
            datetime.now().isoformat(),
            payment_id
        )
    )

    conn.commit()

    updated_payment = conn.execute(
        "SELECT * FROM payments WHERE payment_id = ?",
        (payment_id,)
    ).fetchone()

    conn.close()

    payment_data = dict(updated_payment)

    if payment_data["ai_explanation"]:

        try:
            payment_data["ai_explanation"] = json.loads(
                payment_data["ai_explanation"]
            )

        except:
            pass

    if payment_data["whatsapp_notification"]:

        try:
            payment_data["whatsapp_notification"] = json.loads(
                payment_data["whatsapp_notification"]
            )

        except:
            pass

    return {
        "message": "Payment recovery successful",
        "status": "SUCCESS",
        "recovery_attempts": new_attempt_count,
        "max_attempts": MAX_RECOVERY_ATTEMPTS,
        "cooldown_seconds": RECOVERY_COOLDOWN_SECONDS,
        "safety_status": "SAFE",
        "payment": payment_data
    }
# =========================================================
# HUMAN-IN-THE-LOOP APPROVAL
# =========================================================

@app.post("/approve-recovery/{payment_id}")
def approve_recovery(payment_id: str):

    conn = get_db_connection()

    payment = conn.execute(
        "SELECT * FROM payments WHERE payment_id = ?",
        (payment_id,)
    ).fetchone()

    if payment is None:
        conn.close()

        return {
            "message": "Payment not found",
            "status": "NOT_FOUND"
        }

    # Only High Priority payments require human approval
    if payment["priority"] != "High":
        conn.close()

        return {
            "message": "Human approval is not required for this payment",
            "status": "NOT_REQUIRED",
            "payment_id": payment_id,
            "priority": payment["priority"]
        }

    # Payment already recovered
    if payment["recovery_status"] == "Recovery successful":
        conn.close()

        return {
            "message": "Payment already recovered",
            "status": "ALREADY_RECOVERED",
            "payment_id": payment_id
        }

    conn.execute(
        """
        UPDATE payments
        SET recovery_status = ?
        WHERE payment_id = ?
        """,
        (
            "Recovery approved",
            payment_id
        )
    )

    conn.commit()
    conn.close()

    return {
        "message": "Recovery approved by human operator",
        "status": "APPROVED",
        "payment_id": payment_id,
        "priority": "High"
    }

# =========================================================
# INCIDENT DETECTION
# =========================================================

def detect_incidents():

    conn = get_db_connection()

    rows = conn.execute(
        """
        SELECT
            failure_reason,
            COUNT(*) AS payment_count,
            COALESCE(SUM(amount), 0) AS total_failed_amount
        FROM payments
        WHERE status = 'failed'
        GROUP BY failure_reason
        """
    ).fetchall()

    incidents = []

    for row in rows:

        failure_reason = row["failure_reason"]
        payment_count = row["payment_count"]
        total_failed_amount = row["total_failed_amount"]

        # Determine incident severity

        if total_failed_amount >= 10000 or payment_count >= 5:
            severity = "Critical"

        elif total_failed_amount >= 5000 or payment_count >= 3:
            severity = "High"

        elif total_failed_amount >= 2000 or payment_count >= 2:
            severity = "Medium"

        else:
            severity = "Low"

        # Revenue at risk

        revenue_at_risk = total_failed_amount

        # Recovery strategy

        if failure_reason == "insufficient_funds":
            recovery_strategy = (
                "Customer fund top-up and payment retry"
            )

        elif failure_reason == "network_error":
            recovery_strategy = "Immediate payment retry"

        elif failure_reason == "timeout":
            recovery_strategy = "Payment retry"

        elif failure_reason == "card_declined":
            recovery_strategy = "Alternative payment method"

        else:
            recovery_strategy = "Manual review"

        incident_id = f"INC-{failure_reason}"

        incidents.append(
            {
                "incident_id": incident_id,
                "failure_reason": failure_reason,
                "payment_count": payment_count,
                "total_failed_amount": total_failed_amount,
                "severity": severity,
                "revenue_at_risk": revenue_at_risk,
                "recovery_strategy": recovery_strategy
            }
        )

    conn.close()

    return incidents


# =========================================================
# INCIDENT API
# =========================================================

@app.get("/incidents")
def get_incidents():

    incidents = detect_incidents()

    return {
        "total_incidents": len(incidents),
        "incidents": incidents
    }


# =========================================================
# ANALYTICS
# =========================================================

def get_revenue_summary():

    conn = get_db_connection()

    total_failed = conn.execute(
        "SELECT COUNT(*) FROM payments WHERE status = ?",
        ("failed",)
    ).fetchone()[0]

    total_amount = conn.execute(
        """
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE status = ?
        """,
        ("failed",)
    ).fetchone()[0]

    high_priority = conn.execute(
        "SELECT COUNT(*) FROM payments WHERE priority = ?",
        ("High",)
    ).fetchone()[0]

    recovered = conn.execute(
        """
        SELECT COUNT(*)
        FROM payments
        WHERE recovery_status = ?
        """,
        ("Recovery successful",)
    ).fetchone()[0]

    recovery_rate = (
        round((recovered / total_failed) * 100)
        if total_failed > 0
        else 0
    )

    failure_rows = conn.execute(
        """
        SELECT failure_reason, COUNT(*) as count
        FROM payments
        GROUP BY failure_reason
        """
    ).fetchall()

    failure_breakdown = {
        row["failure_reason"]: row["count"]
        for row in failure_rows
    }

    priority_rows = conn.execute(
        """
        SELECT priority, COUNT(*) as count
        FROM payments
        GROUP BY priority
        """
    ).fetchall()

    priority_breakdown = {
        row["priority"]: row["count"]
        for row in priority_rows
    }

    conn.close()

    return {
        "total_failed_payments": total_failed,
        "total_failed_amount": total_amount,
        "high_priority_payments": high_priority,
        "recovered_payments": recovered,
        "recovery_rate": recovery_rate,
        "failure_breakdown": failure_breakdown,
        "priority_breakdown": priority_breakdown
    }


@app.get("/analytics")
def analytics():

    summary = get_revenue_summary()

    incidents = detect_incidents()

    total_revenue_at_risk = sum(
        incident["revenue_at_risk"]
        for incident in incidents
    )

    summary["total_revenue_at_risk"] = total_revenue_at_risk
    summary["total_incidents"] = len(incidents)

    return summary


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {
        "project": "PayRescue",
        "message": "Payment Recovery System is running"
    }
# =========================================================
# RAZORPAY TEST PAYMENT SIMULATOR
# =========================================================

class TestPaymentRequest(BaseModel):
    amount: float
    customer_type: str = "regular"
    scenario: str = "insufficient_funds"


@app.post("/razorpay-test/simulate")
def simulate_razorpay_test_payment(request: TestPaymentRequest):

    scenario = request.scenario.lower().strip()

    scenario_map = {
        "success": {
            "failure_reason": None,
            "status": "success"
        },
        "insufficient_funds": {
            "failure_reason": "insufficient_funds",
            "status": "failed"
        },
        "card_declined": {
            "failure_reason": "card_declined",
            "status": "failed"
        },
        "network_error": {
            "failure_reason": "network_error",
            "status": "failed"
        },
        "timeout": {
            "failure_reason": "timeout",
            "status": "failed"
        }
    }

    if scenario not in scenario_map:
        return {
            "status": "ERROR",
            "message": "Invalid test scenario",
            "available_scenarios": list(scenario_map.keys())
        }

    scenario_data = scenario_map[scenario]

    # Generate unique simulator payment ID
    conn = get_db_connection()

    existing = conn.execute(
        "SELECT COUNT(*) FROM payments"
    ).fetchone()[0]

    payment_id = f"RZP-TEST-{existing + 1:04d}"

    conn.close()

    # Successful test payment
    if scenario == "success":

        return {
            "source": "Razorpay Test Payment Simulator",
            "mode": "TEST",
            "payment_id": payment_id,
            "amount": request.amount,
            "customer_type": request.customer_type,
            "status": "success",
            "message": "Simulated Razorpay test payment successful"
        }

    # Failed test payment goes through
    # the existing PayRescue AI engine
    payment = Payment(
        payment_id=payment_id,
        amount=request.amount,
        status="failed",
        failure_reason=scenario_data["failure_reason"],
        customer_type=request.customer_type
    )

    result = add_payment(payment)

    return {
        "source": "Razorpay Test Payment Simulator",
        "mode": "TEST",
        "simulated": True,
        "payment": result["payment"]
    }