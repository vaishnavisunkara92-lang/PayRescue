from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import sqlite3
import json

# =========================
# DATABASE
# =========================

def get_db_connection():
    conn = sqlite3.connect("payrescue.db")
    conn.row_factory = sqlite3.Row
    return conn


# =========================
# FASTAPI
# =========================

app = FastAPI(title="PayRescue API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# PAYMENT MODEL
# =========================

class Payment(BaseModel):
    payment_id: str
    amount: float
    status: str
    failure_reason: str | None = None
    customer_type: str = "regular"


payments = []


# =========================
# FAILURE DIAGNOSIS
# =========================

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


# =========================
# RECOVERY SCORE
# =========================

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


# =========================
# PRIORITY
# =========================

def get_priority(recovery_score):

    if recovery_score >= 80:
        return "High"

    elif recovery_score >= 50:
        return "Medium"

    else:
        return "Low"


# =========================
# AI EXPLANATION
# =========================

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


# =========================
# RECOVERY ACTION
# =========================

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


# =========================
# SIMULATE RECOVERY
# =========================

def simulate_recovery(recovery_action):

    if "Retry payment" in recovery_action:
        return "Recovery attempt initiated"

    elif "Ask customer" in recovery_action:
        return "Customer notified to use another payment method"

    else:
        return "Payment sent for manual recovery"


# =========================
# VERIFY RECOVERY
# =========================

def verify_recovery(recovery_status):

    if recovery_status == "Recovery attempt initiated":
        return "Recovery pending verification"

    elif recovery_status == "Customer notified to use another payment method":
        return "Waiting for customer to retry"

    else:
        return "Manual recovery pending"


# =========================
# LEARNING
# =========================

def learn_from_payment(payment_data):

    if payment_data["recovery_status"] == "Recovery attempt initiated":
        return "Recovery strategy recorded for future optimization"

    elif payment_data["recovery_status"] == "Customer notified to use another payment method":
        return "Alternative payment strategy recorded"

    else:
        return "Manual recovery case recorded"

# =========================
# SIMULATED WHATSAPP NOTIFICATION
# =========================

def generate_whatsapp_notification(payment_data):

    amount = payment_data["amount"]
    failure_reason = payment_data["failure_reason"]
    recovery_action = payment_data["recovery_action"]

    if failure_reason == "insufficient_funds":
        message = (
            f"⚠️ Your payment of ₹{amount:.0f} failed due to insufficient funds. "
            f"Please add funds and retry the payment."
        )

    elif failure_reason == "network_error":
        message = (
            f"⚠️ Your payment of ₹{amount:.0f} failed due to a temporary "
            f"network issue. Please retry the payment."
        )

    elif failure_reason == "timeout":
        message = (
            f"⚠️ Your payment of ₹{amount:.0f} timed out. "
            f"Please try the payment again."
        )

    elif failure_reason == "card_declined":
        message = (
            f"⚠️ Your payment of ₹{amount:.0f} was declined. "
            f"Please use another payment method."
        )

    else:
        message = (
            f"⚠️ Your payment of ₹{amount:.0f} could not be completed. "
            f"Please try another payment method."
        )

    return {
        "channel": "WhatsApp",
        "mode": "Simulated",
        "status": "Notification generated",
        "message": message,
        "recommended_action": recovery_action
    }

# =========================
# ADD PAYMENT
# =========================

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
    payment_data["whatsapp_notification"] = generate_whatsapp_notification(
        payment_data
    )

    # Save payment to SQLite
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


# =========================
# GET PAYMENTS
# =========================

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
                    "explanation": [
                        payment["ai_explanation"]
                    ],
                    "decision": ""
                }

    return {
        "total_payments": len(payments_data),
        "payments": payments_data
    }


# =========================
# RECOVER PAYMENT
# =========================

@app.post("/recover/{payment_id}")
def recover_payment(payment_id: str):

    conn = get_db_connection()

    payment = conn.execute(
        "SELECT * FROM payments WHERE payment_id = ?",
        (payment_id,)
    ).fetchone()

    if payment is None:
        conn.close()

        return {
            "message": "Payment not found"
        }

    if payment["recovery_status"] == "Recovery attempt initiated":

        conn.execute(
            """
            UPDATE payments
            SET recovery_status = ?,
                verification_status = ?,
                learning_result = ?
            WHERE payment_id = ?
            """,
            (
                "Recovery successful",
                "Payment recovered successfully",
                "Successful recovery recorded for future optimization",
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

        return {
            "message": "Payment recovery successful",
            "payment": payment_data
        }

    conn.close()

    return {
        "message": "Payment is not eligible for recovery"
    }

# =========================
# ANALYTICS
# =========================

def get_revenue_summary():

    conn = get_db_connection()

    total_failed = conn.execute(
        "SELECT COUNT(*) FROM payments WHERE status = ?",
        ("failed",)
    ).fetchone()[0]

    total_amount = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = ?",
        ("failed",)
    ).fetchone()[0]

    high_priority = conn.execute(
        "SELECT COUNT(*) FROM payments WHERE priority = ?",
        ("High",)
    ).fetchone()[0]

    recovered = conn.execute(
        "SELECT COUNT(*) FROM payments WHERE recovery_status = ?",
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

    return get_revenue_summary()


# =========================
# ROOT
# =========================

@app.get("/")
def root():

    return {
        "project": "PayRescue",
        "message": "Payment Recovery System is running"
    }