import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";
const MAX_RECOVERY_ATTEMPTS = 3;

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    shield: (
      <>
        <path d="M12 3l7 3v5c0 4.7-2.8 8.3-7 10-4.2-1.7-7-5.3-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),

    activity: (
      <>
        <path d="M3 12h4l2.2-6 4 12 2.2-6H21" />
      </>
    ),

    payments: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </>
    ),

    rupee: (
      <>
        <path d="M6 5h12" />
        <path d="M6 9h9" />
        <path d="M8 5c4 0 6 2 6 5s-2 5-6 5" />
        <path d="M8 15l7 4" />
      </>
    ),

    alert: (
      <>
        <path d="M10.3 4.3L2.8 17a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z" />
        <path d="M12 9v4" />
        <path d="M12 16h.01" />
      </>
    ),

    trend: (
      <>
        <path d="M3 17l6-6 4 4 8-9" />
        <path d="M15 6h6v6" />
      </>
    ),

    incident: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8v4l2.5 2" />
      </>
    ),

    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),

    eye: (
      <>
        <path d="M2.5 12s3.2-5 9.5-5 9.5 5 9.5 5-3.2 5-9.5 5-9.5-5-9.5-5z" />
        <circle cx="12" cy="12" r="2.2" />
      </>
    ),

    refresh: (
      <>
        <path d="M20 11a8 8 0 00-14.7-4L3 10" />
        <path d="M3 5v5h5" />
        <path d="M4 13a8 8 0 0014.7 4L21 14" />
        <path d="M21 19v-5h-5" />
      </>
    ),

    brain: (
      <>
        <path d="M9 4a3 3 0 00-3 3v.3A3.5 3.5 0 004 10.5 3.5 3.5 0 007.5 14H8" />
        <path d="M15 4a3 3 0 003 3v.3a3.5 3.5 0 011.9 6.2A3.5 3.5 0 0116.5 14H16" />
        <path d="M9 4v16" />
        <path d="M15 4v16" />
        <path d="M9 9h2" />
        <path d="M13 15h2" />
      </>
    ),

    message: (
      <>
        <path d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
        <path d="M7 10h10" />
        <path d="M7 13h7" />
      </>
    ),

    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12l2.5 2.5L16 9" />
      </>
    ),

    close: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </>
    ),

    database: (
      <>
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
        <path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />
      </>
    ),

    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l5 5" />
      </>
    ),

    filter: (
      <>
        <path d="M4 6h16" />
        <path d="M7 12h10" />
        <path d="M10 18h4" />
      </>
    ),

    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 018 0v3" />
      </>
    ),

    zap: (
      <>
        <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
      </>
    ),
  };

  return <svg {...common}>{icons[name] || icons.activity}</svg>;
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatReason(value) {
  if (!value) return "Unknown";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSeverityClass(value) {
  return value ? value.toLowerCase() : "";
}

function parseJsonValue(value) {
  if (!value) return null;

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return null;
}

/*
  Frontend safety guardrails.

  These checks are for the dashboard demonstration.
  The backend remains the final recovery authority.
*/
function getSafetyChecks(payment) {
  const score = Number(payment?.recovery_score || 0);
  const amount = Number(payment?.amount || 0);
  const attempts = Number(payment?.recovery_attempts || 0);
  const paymentId = payment?.payment_id?.trim();

  const alreadyRecovered =
    payment?.recovery_status === "Recovery successful";

  const retryLimit =
    attempts < MAX_RECOVERY_ATTEMPTS && !alreadyRecovered;

  const cooldown =
    !alreadyRecovered &&
    payment?.recovery_status !== "Recovery blocked";

  const exposure = amount <= 10000;

  const confidence = score >= 50;

  const idempotency = Boolean(paymentId);

  return [
    {
      name: "Retry limit",
      passed: retryLimit,
      detail: retryLimit
        ? `${attempts}/${MAX_RECOVERY_ATTEMPTS} attempts used`
        : alreadyRecovered
        ? "Payment already recovered"
        : `Maximum ${MAX_RECOVERY_ATTEMPTS} attempts reached`,
    },

    {
      name: "Cooldown",
      passed: cooldown,
      detail: cooldown
        ? "No active cooldown detected"
        : "Recovery temporarily blocked",
    },

    {
      name: "Exposure limit",
      passed: exposure,
      detail: exposure
        ? "Amount within demo exposure limit"
        : "Amount exceeds demo limit",
    },

    {
      name: "Confidence threshold",
      passed: confidence,
      detail: confidence
        ? `Score ${score}/100 meets threshold`
        : `Score ${score}/100 below threshold`,
    },

    {
      name: "Idempotency",
      passed: idempotency,
      detail: idempotency
        ? "Unique payment ID available"
        : "Payment ID missing",
    },
  ];
}

function getAlternativePaymentRecommendation(payment) {
  const reason = payment?.failure_reason;

  if (reason === "card_declined") {
    return {
      method: "UPI",
      reason: "Card payment was declined",
      action: "Recommend UPI or another payment method",
    };
  }

  if (reason === "network_error") {
    return {
      method: "Retry",
      reason: "Payment network appears unstable",
      action: "Retry after a short delay",
    };
  }

  if (reason === "timeout") {
    return {
      method: "Retry",
      reason: "Payment processing timed out",
      action: "Retry payment",
    };
  }

  if (reason === "insufficient_funds") {
    return {
      method: "Add Funds",
      reason: "Customer has insufficient funds",
      action: "Ask customer to add funds and retry",
    };
  }

  return {
    method: "Manual Review",
    reason: "Failure reason is unknown",
    action: "Send payment for manual review",
  };
}

function getPaymentMethodHealth(payment) {
  const reason = payment?.failure_reason;

  if (reason === "card_declined") {
    return {
      method: "Card",
      health: "Degraded",
      recommendation: "Try an alternative payment method",
    };
  }

  if (reason === "network_error") {
    return {
      method: "Network",
      health: "Unstable",
      recommendation: "Retry after a short delay",
    };
  }

  if (reason === "timeout") {
    return {
      method: "Processing",
      health: "Degraded",
      recommendation: "Retry payment",
    };
  }

  if (reason === "insufficient_funds") {
    return {
      method: "Customer Funds",
      health: "Normal",
      recommendation: "Ask customer to add funds and retry",
    };
  }

  return {
    method: "Unknown",
    health: "Unknown",
    recommendation: "Manual review",
  };
}

function App() {
  const [showForm, setShowForm] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const [payments, setPayments] = useState([]);
  const [incidents, setIncidents] = useState([]);

  const [analytics, setAnalytics] = useState({
    total_failed_payments: 0,
    total_failed_amount: 0,
    high_priority_payments: 0,
    recovered_payments: 0,
    recovery_rate: 0,
    failure_breakdown: {},
    priority_breakdown: {},
    total_incidents: 0,
    total_revenue_at_risk: 0,
  });

  const [formData, setFormData] = useState({
    payment_id: "",
    amount: "",
    status: "failed",
    failure_reason: "",
    customer_type: "",
  });

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveringId, setRecoveringId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        paymentsResponse,
        analyticsResponse,
        incidentsResponse,
      ] = await Promise.all([
        fetch(`${API_BASE}/payments`),
        fetch(`${API_BASE}/analytics`),
        fetch(`${API_BASE}/incidents`),
      ]);

      if (!paymentsResponse.ok) {
        throw new Error("Could not load payments");
      }

      if (!analyticsResponse.ok) {
        throw new Error("Could not load analytics");
      }

      if (!incidentsResponse.ok) {
        throw new Error("Could not load incidents");
      }

      const paymentsData = await paymentsResponse.json();
      const analyticsData = await analyticsResponse.json();
      const incidentsData = await incidentsResponse.json();

      const formattedPayments = (
        paymentsData.payments || []
      ).map((payment) => ({
        ...payment,

        recovery_attempts: Number(
          payment.recovery_attempts || 0
        ),

        ai_explanation: parseJsonValue(
          payment.ai_explanation
        ),

        whatsapp_notification: parseJsonValue(
          payment.whatsapp_notification
        ),
      }));

      setPayments(formattedPayments);
      setAnalytics(analyticsData);
      setIncidents(incidentsData.incidents || []);
      setError("");
    } catch (err) {
      console.error("Backend connection error:", err);

      setError(
        "Could not connect to PayRescue backend. Make sure the backend is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          payment_id: formData.payment_id,
          amount: Number(formData.amount),
          status: formData.status,
          failure_reason: formData.failure_reason,
          customer_type: formData.customer_type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Payment could not be recorded"
        );
      }

      setMessage("Payment recorded successfully.");

      setFormData({
        payment_id: "",
        amount: "",
        status: "failed",
        failure_reason: "",
        customer_type: "",
      });

      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleApproveRecovery = async (paymentId) => {
    setError("");
    setMessage("");
    setApprovingId(paymentId);

    try {
      const response = await fetch(
        `${API_BASE}/approve-recovery/${paymentId}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Recovery approval failed"
        );
      }

      if (data.status === "APPROVED") {
        setMessage(
          "Recovery approved by human operator. You can now recover this payment."
        );
      } else {
        setMessage(
          data.message || "Approval processed."
        );
      }

      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleRecovery = async (paymentId) => {
    setError("");
    setMessage("");

    const payment = payments.find(
      (item) => item.payment_id === paymentId
    );

    if (!payment) {
      setError("Payment could not be found.");
      return;
    }

    const attempts = Number(
      payment.recovery_attempts || 0
    );

    /*
      Frontend idempotency protection.
    */
    if (
      payment.recovery_status ===
      "Recovery successful"
    ) {
      setSelectedPayment(payment);
      setShowAnalysis(true);
      setMessage("Payment is already recovered.");
      return;
    }

    /*
      Frontend retry-limit protection.
    */
    if (attempts >= MAX_RECOVERY_ATTEMPTS) {
      setSelectedPayment(payment);
      setShowAnalysis(true);

      setError(
        `Recovery blocked: maximum ${MAX_RECOVERY_ATTEMPTS} attempts reached. Manual review required.`
      );

      return;
    }

    /*
      Safety checks before backend call.
    */
    const safetyChecks = getSafetyChecks(payment);

    const safetyPassed = safetyChecks.every(
      (check) => check.passed
    );

    if (!safetyPassed) {
      setSelectedPayment(payment);
      setShowAnalysis(true);

      setError(
        "Recovery blocked by PayRescue safety guardrails."
      );

      return;
    }

    try {
      setRecoveringId(paymentId);

      const response = await fetch(
        `${API_BASE}/recover/${paymentId}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Recovery failed"
        );
      }

      /*
        Backend can return:
        SUCCESS
        BLOCKED
        Already recovered
      */
      if (data.status === "BLOCKED") {
        setError(
          data.message ||
            "Recovery blocked. Manual review required."
        );
      } else if (
        data.status === "Already recovered"
      ) {
        setMessage(
          data.message ||
            "Payment is already recovered."
        );
      } else {
        setMessage(
          data.message ||
            "Recovery completed successfully."
        );
      }

      await loadData();

      if (data.payment) {
        const normalizedPayment = {
          ...data.payment,

          recovery_attempts: Number(
            data.payment.recovery_attempts || 0
          ),

          ai_explanation: parseJsonValue(
            data.payment.ai_explanation
          ),

          whatsapp_notification: parseJsonValue(
            data.payment.whatsapp_notification
          ),
        };

        setSelectedPayment(normalizedPayment);
        setShowAnalysis(true);
      } else {
        const refreshedPayment = payments.find(
          (item) => item.payment_id === paymentId
        );

        if (refreshedPayment) {
          setSelectedPayment(refreshedPayment);
          setShowAnalysis(true);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setRecoveringId(null);
    }
  };

  const handleViewAnalysis = (payment) => {
    setSelectedPayment(payment);
    setShowAnalysis(true);
    setError("");
  };

  const sortedPayments = useMemo(() => {
    return [...payments].sort(
      (a, b) =>
        Number(b.recovery_score || 0) -
        Number(a.recovery_score || 0)
    );
  }, [payments]);

  const recoveryQueue = useMemo(() => {
    return sortedPayments.filter((payment) => {
      const matchesSearch =
        !searchTerm ||
        payment.payment_id
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        formatReason(payment.failure_reason)
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesPriority =
        priorityFilter === "All" ||
        payment.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [
    sortedPayments,
    searchTerm,
    priorityFilter,
  ]);

  const recoveredPayments = payments.filter(
    (payment) =>
      payment.recovery_status ===
      "Recovery successful"
  );

  const recoveryRate =
    payments.length > 0
      ? Math.round(
          (recoveredPayments.length /
            payments.length) *
            100
        )
      : 0;

  const totalIncidents =
    analytics.total_incidents ||
    incidents.length;

  const revenueAtRisk =
    analytics.total_revenue_at_risk || 0;

  const queueReadyCount = payments.filter(
    (payment) =>
      payment.recovery_status ===
      "Recovery attempt initiated"
  ).length;

  const safeRecoveryCount = payments.filter(
    (payment) => {
      if (
        payment.recovery_status !==
          "Recovery attempt initiated" &&
        payment.recovery_status !==
          "Recovery approved"
      ) {
        return false;
      }

      return getSafetyChecks(payment).every(
        (check) => check.passed
      );
    }
  ).length;

  return (
    <div className="app">
      {/* HEADER */}

      <header className="header">
        <div className="brand-area">
          <div className="brand-icon">
            <Icon name="shield" size={22} />
          </div>

          <div>
            <h1>PayRescue</h1>
            <p>AI Payment Recovery Operations</p>
          </div>
        </div>

        <div className="header-right">
          <div className="system-status">
            <span className="status-dot"></span>
            System Operational
          </div>

          <div className="header-divider"></div>

          <div className="header-label">
            <Icon name="database" size={16} />
            Live Monitoring
          </div>
        </div>
      </header>

      <main className="dashboard">
        {/* HERO */}

        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <span></span>
              RECOVERY OPERATIONS CENTER
            </div>

            <h2>Payment Recovery Dashboard</h2>

            <p>
              Monitor failed transactions, detect payment
              incidents, evaluate recovery opportunities,
              and execute explainable recovery actions.
            </p>
          </div>

          <div className="hero-meta">
            <div className="hero-meta-icon">
              <Icon name="activity" size={21} />
            </div>

            <div>
              <strong>AI Decision Engine</strong>
              <span>Explainable & rule-driven</span>
            </div>
          </div>
        </section>

        {/* KPI CARDS */}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon blue">
                <Icon name="payments" size={19} />
              </div>

              <span className="stat-label">
                PAYMENT VOLUME
              </span>
            </div>

            <div className="stat-value">
              {analytics.total_failed_payments}
            </div>

            <div className="stat-footer">
              <span>Failed transactions</span>
              <Icon name="trend" size={14} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon cyan">
                <Icon name="rupee" size={19} />
              </div>

              <span className="stat-label">
                FAILED VALUE
              </span>
            </div>

            <div className="stat-value">
              {formatCurrency(
                analytics.total_failed_amount
              )}
            </div>

            <div className="stat-footer">
              <span>Failed payment amount</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon orange">
                <Icon name="alert" size={19} />
              </div>

              <span className="stat-label">
                HIGH PRIORITY
              </span>
            </div>

            <div className="stat-value">
              {analytics.high_priority_payments}
            </div>

            <div className="stat-footer">
              <span>Require immediate attention</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon green">
                <Icon name="check" size={19} />
              </div>

              <span className="stat-label">
                RECOVERY RATE
              </span>
            </div>

            <div className="stat-value">
              {recoveryRate}%
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${recoveryRate}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon purple">
                <Icon name="incident" size={19} />
              </div>

              <span className="stat-label">
                ACTIVE INCIDENTS
              </span>
            </div>

            <div className="stat-value">
              {totalIncidents}
            </div>

            <div className="stat-footer">
              <span>Detected failure patterns</span>
            </div>
          </div>

          <div className="stat-card risk-card">
            <div className="risk-glow"></div>

            <div className="stat-top">
              <div className="stat-icon risk">
                <Icon name="alert" size={19} />
              </div>

              <span className="stat-label">
                REVENUE AT RISK
              </span>
            </div>

            <div className="stat-value">
              {formatCurrency(revenueAtRisk)}
            </div>

            <div className="stat-footer">
              <span>
                Potentially recoverable value
              </span>

              <span className="risk-indicator">
                MONITOR
              </span>
            </div>
          </div>
        </section>

        {/* OVERVIEW */}

        <section className="overview-grid">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <div className="panel-kicker">
                  FAILURE INTELLIGENCE
                </div>

                <h3>Failure Breakdown</h3>
              </div>

              <div className="heading-icon blue">
                <Icon name="activity" size={18} />
              </div>
            </div>

            <div className="breakdown-list">
              {Object.entries(
                analytics.failure_breakdown || {}
              ).length === 0 ? (
                <div className="mini-empty">
                  No failure data available.
                </div>
              ) : (
                Object.entries(
                  analytics.failure_breakdown || {}
                ).map(([reason, count]) => (
                  <div
                    className="breakdown-item"
                    key={reason}
                  >
                    <div className="breakdown-name">
                      <span className="breakdown-dot"></span>
                      {formatReason(reason)}
                    </div>

                    <div className="breakdown-number">
                      {count}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <div className="panel-kicker">
                  RECOVERY PRIORITIZATION
                </div>

                <h3>Priority Breakdown</h3>
              </div>

              <div className="heading-icon orange">
                <Icon name="alert" size={18} />
              </div>
            </div>

            <div className="breakdown-list">
              {Object.entries(
                analytics.priority_breakdown || {}
              ).length === 0 ? (
                <div className="mini-empty">
                  No priority data available.
                </div>
              ) : (
                Object.entries(
                  analytics.priority_breakdown || {}
                ).map(([priority, count]) => (
                  <div
                    className="breakdown-item"
                    key={priority}
                  >
                    <div className="breakdown-name">
                      <span
                        className={`priority-mini-dot ${getSeverityClass(
                          priority
                        )}`}
                      ></span>

                      {formatReason(priority)}
                    </div>

                    <div className="breakdown-number">
                      {count}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* INCIDENT COMMAND CENTER */}

        <section className="section-card">
          <div className="section-header">
            <div>
              <div className="section-kicker">
                INCIDENT INTELLIGENCE
              </div>

              <h2>Incident Command Center</h2>

              <p>
                PayRescue groups related payment failures
                into meaningful operational incidents.
              </p>
            </div>

            <div className="section-status">
              <span className="status-dot"></span>
              {totalIncidents} Active
            </div>
          </div>

          {incidents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Icon name="check" size={24} />
              </div>

              <h3>No incidents detected</h3>

              <p>
                Incidents will appear when failed payment
                patterns are detected.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Failure Reason</th>
                    <th>Payments</th>
                    <th>Failed Amount</th>
                    <th>Severity</th>
                    <th>Revenue at Risk</th>
                    <th>Recovery Strategy</th>
                    <th>Method Health</th>
                    <th>Recovery Recommendation</th>
                  </tr>
                </thead>

                <tbody>
                  {incidents.map((incident) => (
                    <tr key={incident.incident_id}>
                      <td>
                        <div className="incident-id">
                          <span className="incident-symbol">
                            <Icon
                              name="incident"
                              size={14}
                            />
                          </span>

                          {incident.incident_id}
                        </div>
                      </td>

                      <td>
                        <span className="reason-text">
                          {formatReason(
                            incident.failure_reason
                          )}
                        </span>
                      </td>

                      <td>
                        <span className="table-number">
                          {incident.payment_count}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            incident.total_failed_amount
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`severity-badge ${getSeverityClass(
                            incident.severity
                          )}`}
                        >
                          <span></span>
                          {incident.severity}
                        </span>
                      </td>

                      <td>
                        <strong className="risk-value">
                          {formatCurrency(
                            incident.revenue_at_risk
                          )}
                        </strong>
                      </td>

                      <td>
                        <span className="strategy-text">
                          {incident.recovery_strategy}
                        </span>
                      </td>

                      <td>
                        <div>
                          <strong>
                            {
                              getPaymentMethodHealth(
                                incident
                              ).health
                            }
                          </strong>

                          <div className="muted-text">
                            {
                              getPaymentMethodHealth(
                                incident
                              ).method
                            }
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="strategy-text">
                          {
                            getAlternativePaymentRecommendation(
                              incident
                            ).action
                          }
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* RECOVERY OPERATIONS QUEUE */}

        <section className="section-card recovery-operations-card">
          <div className="section-header">
            <div>
              <div className="section-kicker">
                RECOVERY OPERATIONS
              </div>

              <h2>Recovery Operations Queue</h2>

              <p>
                Prioritized recovery opportunities ready
                for safe operational action.
              </p>
            </div>

            <div className="queue-summary">
              <div>
                <span>QUEUE READY</span>
                <strong>{queueReadyCount}</strong>
              </div>

              <div className="queue-summary-divider"></div>

              <div>
                <span>SAFETY CLEARED</span>
                <strong>{safeRecoveryCount}</strong>
              </div>
            </div>
          </div>

          {/* QUEUE TOOLBAR */}

          <div className="queue-toolbar">
            <div className="search-box">
              <Icon name="search" size={17} />

              <input
                type="text"
                placeholder="Search payment ID or failure reason..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />
            </div>

            <div className="filter-box">
              <Icon name="filter" size={16} />

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value)
                }
              >
                <option value="All">
                  All Priorities
                </option>

                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="queue-count">
              {recoveryQueue.length} payment
              {recoveryQueue.length !== 1 ? "s" : ""}
            </div>
          </div>

          {recoveryQueue.length === 0 ? (
            <div className="queue-empty">
              <div className="empty-icon">
                <Icon name="check" size={23} />
              </div>

              <h3>
                No matching recovery opportunities
              </h3>

              <p>
                Try changing your search or priority
                filter.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table recovery-queue-table">
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Amount</th>
                    <th>Score</th>
                    <th>Priority</th>
                    <th>Recovery Strategy</th>
                    <th>Attempts</th>
                    <th>Safety</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {recoveryQueue.map((payment) => {
                    const safetyChecks =
                      getSafetyChecks(payment);

                    const safetyPassed =
                      safetyChecks.every(
                        (check) => check.passed
                      );

                    const attempts = Number(
                      payment.recovery_attempts || 0
                    );

                    const attemptsReached =
                      attempts >=
                      MAX_RECOVERY_ATTEMPTS;

                    const isAlreadyRecovered =
                      payment.recovery_status ===
                      "Recovery successful";

                    const isApprovalRequired =
                      payment.priority === "High" &&
                      !isAlreadyRecovered &&
                      payment.recovery_status !==
                        "Recovery approved";

                    const isApproved =
                      payment.recovery_status ===
                      "Recovery approved";

                    const canRecover =
                      !isAlreadyRecovered &&
                      !attemptsReached &&
                      safetyPassed &&
                      (payment.priority !== "High" ||
                        isApproved);

                    return (
                      <tr key={payment.payment_id}>
                        <td>
                          <div className="payment-id">
                            <span className="payment-symbol">
                              <Icon
                                name="payments"
                                size={14}
                              />
                            </span>

                            <strong>
                              {payment.payment_id}
                            </strong>
                          </div>
                        </td>

                        <td>
                          <strong>
                            {formatCurrency(
                              payment.amount
                            )}
                          </strong>
                        </td>

                        <td>
                          <div className="score-cell">
                            <div className="score-number">
                              {payment.recovery_score}
                            </div>

                            <div className="score-bar">
                              <span
                                style={{
                                  width: `${Math.min(
                                    Number(
                                      payment.recovery_score ||
                                        0
                                    ),
                                    100
                                  )}%`,
                                }}
                              ></span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`priority-badge ${getSeverityClass(
                              payment.priority
                            )}`}
                          >
                            {payment.priority}
                          </span>
                        </td>

                        <td>
                          <span className="strategy-text">
                            {payment.recovery_action}
                          </span>
                        </td>

                        <td>
                          <div className="attempt-cell">
                            <strong>
                              {attempts}/
                              {MAX_RECOVERY_ATTEMPTS}
                            </strong>

                            <div className="attempt-bar">
                              <span
                                style={{
                                  width: `${Math.min(
                                    (attempts /
                                      MAX_RECOVERY_ATTEMPTS) *
                                      100,
                                    100
                                  )}%`,
                                }}
                              ></span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`safety-status ${
                              safetyPassed
                                ? "safe"
                                : "blocked"
                            }`}
                          >
                            <span>
                              <Icon
                                name={
                                  safetyPassed
                                    ? "shield"
                                    : "lock"
                                }
                                size={12}
                              />
                            </span>

                            {safetyPassed
                              ? "SAFE"
                              : "BLOCKED"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`recovery-status ${
                              payment.recovery_status ===
                              "Recovery successful"
                                ? "success"
                                : payment.recovery_status ===
                                  "Recovery blocked"
                                ? "blocked"
                                : payment.recovery_status ===
                                  "Recovery approved"
                                ? "success"
                                : "pending"
                            }`}
                          >
                            <span></span>

                            {payment.recovery_status}
                          </span>
                        </td>

                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="view-button"
                              onClick={() =>
                                handleViewAnalysis(
                                  payment
                                )
                              }
                            >
                              <Icon
                                name="eye"
                                size={14}
                              />
                              View
                            </button>

                            {/* HIGH PRIORITY HUMAN APPROVAL */}
                            {isApprovalRequired && (
                              <button
                                type="button"
                                className="view-button"
                                disabled={
                                  approvingId ===
                                  payment.payment_id
                                }
                                onClick={() =>
                                  handleApproveRecovery(
                                    payment.payment_id
                                  )
                                }
                              >
                                {approvingId ===
                                payment.payment_id
                                  ? "Approving..."
                                  : "Approve Recovery"}
                              </button>
                            )}

                            {/* RECOVERY */}
                            {canRecover && (
                              <button
                                type="button"
                                className="recover-button"
                                disabled={
                                  recoveringId ===
                                  payment.payment_id
                                }
                                onClick={() =>
                                  handleRecovery(
                                    payment.payment_id
                                  )
                                }
                              >
                                <Icon
                                  name="zap"
                                  size={13}
                                />

                                {recoveringId ===
                                payment.payment_id
                                  ? "Running..."
                                  : "Recover"}
                              </button>
                            )}

                            {/* APPROVAL COMPLETE */}
                            {isApproved && (
                              <span className="recovery-status success">
                                <span></span>
                                Approved
                              </span>
                            )}

                            {/* ALREADY RECOVERED */}
                            {isAlreadyRecovered && (
                              <span className="recovery-status success">
                                <span></span>
                                Already Recovered
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ADD PAYMENT */}

        <section className="section-card">
          <div className="section-header">
            <div>
              <div className="section-kicker">
                PAYMENT INGESTION
              </div>

              <h2>Record Failed Payment</h2>

              <p>
                Add a transaction and let PayRescue
                calculate diagnosis, score, priority,
                and recovery action.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setShowForm((value) => !value);
                setError("");
                setMessage("");
              }}
            >
              <Icon
                name={showForm ? "close" : "plus"}
                size={16}
              />

              {showForm ? "Close Form" : "Add Payment"}
            </button>
          </div>

          {showForm && (
            <form
              className="payment-form"
              onSubmit={handleSubmit}
            >
              <div className="form-heading">
                <div className="form-icon">
                  <Icon
                    name="payments"
                    size={20}
                  />
                </div>

                <div>
                  <h3>New Failed Payment</h3>

                  <p>
                    Enter transaction details to run the
                    PayRescue recovery decision engine.
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Payment ID</label>

                  <input
                    type="text"
                    name="payment_id"
                    value={formData.payment_id}
                    onChange={handleChange}
                    placeholder="Example: PAY030"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Amount</label>

                  <div className="input-with-prefix">
                    <span>₹</span>

                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="3000"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Status</label>

                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="failed">
                      Failed
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Failure Reason</label>

                  <select
                    name="failure_reason"
                    value={formData.failure_reason}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Select failure reason
                    </option>

                    <option value="insufficient_funds">
                      Insufficient Funds
                    </option>

                    <option value="card_declined">
                      Card Declined
                    </option>

                    <option value="network_error">
                      Network Error
                    </option>

                    <option value="timeout">
                      Timeout
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Customer Type</label>

                  <select
                    name="customer_type"
                    value={formData.customer_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Select customer type
                    </option>

                    <option value="regular">
                      Regular
                    </option>

                    <option value="premium">
                      Premium
                    </option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-button"
                >
                  <Icon name="brain" size={16} />
                  Run Recovery Analysis
                </button>
              </div>

              {error && (
                <div className="message error-message">
                  <Icon name="alert" size={17} />
                  {error}
                </div>
              )}

              {message && (
                <div className="message success-message">
                  <Icon name="check" size={17} />
                  {message}
                </div>
              )}
            </form>
          )}

          {!showForm && error && (
            <div className="message error-message">
              <Icon name="alert" size={17} />
              {error}
            </div>
          )}

          {!showForm && message && (
            <div className="message success-message">
              <Icon name="check" size={17} />
              {message}
            </div>
          )}
        </section>

        {/* ANALYSIS + SAFETY */}

        {showAnalysis && selectedPayment && (
          <section className="analysis-panel">
            <div className="analysis-header">
              <div className="analysis-title-area">
                <div className="analysis-icon">
                  <Icon name="brain" size={22} />
                </div>

                <div>
                  <div className="section-kicker">
                    AI DECISION ANALYSIS
                  </div>

                  <h2>Payment Analysis</h2>

                  <p>
                    Transaction{" "}
                    <strong>
                      {selectedPayment.payment_id}
                    </strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setShowAnalysis(false)
                }
              >
                <Icon name="close" size={15} />
                Close
              </button>
            </div>

            {/* HUMAN APPROVAL STATUS */}

            {selectedPayment.priority === "High" && (
              <div className="analysis-section">
                <h3>Human Approval Control</h3>

                <p>
                  <strong>Approval Status:</strong>{" "}
                  {selectedPayment.recovery_status ===
                  "Recovery approved"
                    ? "Recovery Approved"
                    : selectedPayment.recovery_status ===
                      "Recovery successful"
                    ? "Recovery Completed"
                    : "Approval Required"}
                </p>

                {selectedPayment.recovery_status ===
                  "Recovery approved" && (
                  <div className="message success-message">
                    <Icon
                      name="check"
                      size={17}
                    />
                    Human approval completed. Recovery
                    execution is now permitted.
                  </div>
                )}

                {selectedPayment.recovery_status !==
                  "Recovery approved" &&
                  selectedPayment.recovery_status !==
                    "Recovery successful" && (
                    <button
                      type="button"
                      className="recover-button"
                      disabled={
                        approvingId ===
                        selectedPayment.payment_id
                      }
                      onClick={() =>
                        handleApproveRecovery(
                          selectedPayment.payment_id
                        )
                      }
                    >
                      {approvingId ===
                      selectedPayment.payment_id
                        ? "Approving..."
                        : "Approve Recovery"}
                    </button>
                  )}
              </div>
            )}

            {/* SAFETY GUARDRAILS */}

            <div className="safety-panel">
              <div className="safety-panel-header">
                <div>
                  <div className="section-kicker">
                    SAFETY CONTROL LAYER
                  </div>

                  <h3>Recovery Safety Checks</h3>

                  <p>
                    Recovery is evaluated against PayRescue
                    demo guardrails before the recovery API
                    is called.
                  </p>
                </div>

                {(() => {
                  const checks =
                    getSafetyChecks(
                      selectedPayment
                    );

                  const passed = checks.every(
                    (check) => check.passed
                  );

                  const attempts = Number(
                    selectedPayment.recovery_attempts ||
                      0
                  );

                  const alreadyRecovered =
                    selectedPayment.recovery_status ===
                    "Recovery successful";

                  return (
                    <div
                      className={`safety-decision ${
                        passed ? "safe" : "blocked"
                      }`}
                    >
                      <Icon
                        name={
                          passed
                            ? "shield"
                            : "lock"
                        }
                        size={17}
                      />

                      <div>
                        <span>
                          SAFETY DECISION
                        </span>

                        <strong>
                          {alreadyRecovered
                            ? "ALREADY RECOVERED"
                            : attempts >=
                              MAX_RECOVERY_ATTEMPTS
                            ? "RECOVERY BLOCKED"
                            : passed
                            ? "SAFE TO RECOVER"
                            : "RECOVERY BLOCKED"}
                        </strong>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="safety-check-grid">
                {getSafetyChecks(
                  selectedPayment
                ).map((check) => (
                  <div
                    className={`safety-check ${
                      check.passed
                        ? "passed"
                        : "failed"
                    }`}
                    key={check.name}
                  >
                    <div className="safety-check-icon">
                      <Icon
                        name={
                          check.passed
                            ? "check"
                            : "lock"
                        }
                        size={14}
                      />
                    </div>

                    <div>
                      <strong>{check.name}</strong>
                      <span>{check.detail}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="safety-note">
                <Icon name="shield" size={14} />

                Demo guardrails: confidence ≥ 50,
                exposure ≤ ₹10,000, and maximum{" "}
                {MAX_RECOVERY_ATTEMPTS} recovery attempts.
              </div>
            </div>

            {/* RECOVERY ATTEMPT SUMMARY */}

            <div className="analysis-section">
              <h3>Recovery Attempt Control</h3>

              <p>
                <strong>Attempts Used:</strong>{" "}
                {Number(
                  selectedPayment.recovery_attempts || 0
                )}
                /{MAX_RECOVERY_ATTEMPTS}
              </p>

              <p>
                <strong>Idempotency:</strong>{" "}
                {selectedPayment.recovery_status ===
                "Recovery successful"
                  ? "Payment already recovered — duplicate recovery prevented"
                  : "Payment eligible for controlled recovery"}
              </p>

              <p>
                <strong>Recovery Status:</strong>{" "}
                {selectedPayment.recovery_status}
              </p>

              {Number(
                selectedPayment.recovery_attempts || 0
              ) >= MAX_RECOVERY_ATTEMPTS && (
                <div className="message error-message">
                  <Icon
                    name="lock"
                    size={17}
                  />

                  Maximum recovery attempts reached.
                  Manual review is required.
                </div>
              )}
            </div>

            {/* PAYMENT METHOD HEALTH */}

            <div className="analysis-section">
              <h3>Payment Method Health</h3>

              {(() => {
                const health =
                  getPaymentMethodHealth(
                    selectedPayment
                  );

                return (
                  <>
                    <p>
                      <strong>Channel:</strong>{" "}
                      {health.method}
                    </p>

                    <p>
                      <strong>Health:</strong>{" "}
                      {health.health}
                    </p>

                    <p>
                      <strong>
                        Recommended Action:
                      </strong>{" "}
                      {health.recommendation}
                    </p>

                    <small className="muted-text">
                      Simulated recommendation based on
                      failure pattern.
                    </small>
                  </>
                );
              })()}
            </div>

            {/* ALTERNATIVE PAYMENT */}

            <div className="analysis-section">
              <h3>
                Alternative Payment Recommendation
              </h3>

              {(() => {
                const recommendation =
                  getAlternativePaymentRecommendation(
                    selectedPayment
                  );

                return (
                  <>
                    <p>
                      <strong>
                        Recommended Method:
                      </strong>{" "}
                      {recommendation.method}
                    </p>

                    <p>
                      <strong>Reason:</strong>{" "}
                      {recommendation.reason}
                    </p>

                    <p>
                      <strong>Action:</strong>{" "}
                      {recommendation.action}
                    </p>

                    <small className="muted-text">
                      Simulated recommendation based on
                      the detected failure pattern.
                    </small>
                  </>
                );
              })()}
            </div>

            {/* ANALYSIS GRID */}

            <div className="analysis-grid">
              <div className="analysis-item">
                <span>Diagnosis</span>

                <strong>
                  {selectedPayment.diagnosis ||
                    "Not available"}
                </strong>
              </div>

              <div className="analysis-item">
                <span>Recovery Score</span>

                <strong className="analysis-score">
                  {selectedPayment.recovery_score}
                  <small>/100</small>
                </strong>
              </div>

              <div className="analysis-item">
                <span>Priority</span>

                <strong>
                  <span
                    className={`priority-badge ${getSeverityClass(
                      selectedPayment.priority
                    )}`}
                  >
                    {selectedPayment.priority}
                  </span>
                </strong>
              </div>

              <div className="analysis-item">
                <span>Recovery Action</span>

                <strong>
                  {selectedPayment.recovery_action}
                </strong>
              </div>

              <div className="analysis-item">
                <span>Recovery Attempts</span>

                <strong>
                  {Number(
                    selectedPayment.recovery_attempts ||
                      0
                  )}
                  /{MAX_RECOVERY_ATTEMPTS}
                </strong>
              </div>

              <div className="analysis-item">
                <span>Recovery Status</span>

                <strong>
                  {selectedPayment.recovery_status}
                </strong>
              </div>

              <div className="analysis-item">
                <span>Verification Status</span>

                <strong>
                  {selectedPayment.verification_status}
                </strong>
              </div>

              <div className="analysis-item">
                <span>Learning Result</span>

                <strong>
                  {selectedPayment.learning_result}
                </strong>
              </div>
            </div>

            {/* AI EXPLANATION */}

            <div className="ai-explanation">
              <div className="ai-heading">
                <div className="ai-heading-icon">
                  <Icon
                    name="brain"
                    size={19}
                  />
                </div>

                <div>
                  <span>EXPLAINABLE AI</span>

                  <h3>
                    Why PayRescue made this decision
                  </h3>
                </div>
              </div>

              {selectedPayment.ai_explanation ? (
                <div className="ai-content">
                  {selectedPayment.ai_explanation
                    .explanation?.map(
                      (reason, index) => (
                        <div
                          className="ai-reason"
                          key={index}
                        >
                          <span>
                            {String(
                              index + 1
                            ).padStart(2, "0")}
                          </span>

                          <p>{reason}</p>
                        </div>
                      )
                    )}

                  <div className="ai-decision">
                    <span>
                      RECOMMENDED DECISION
                    </span>

                    <strong>
                      {
                        selectedPayment
                          .ai_explanation
                          .decision
                      }
                    </strong>
                  </div>
                </div>
              ) : (
                <p className="not-available">
                  AI explanation not available.
                </p>
              )}
            </div>

            {/* WHATSAPP */}

            {selectedPayment.whatsapp_notification && (
              <div className="notification-card">
                <div className="notification-header">
                  <div className="notification-icon">
                    <Icon
                      name="message"
                      size={18}
                    />
                  </div>

                  <div>
                    <span>
                      COMMUNICATION LAYER
                    </span>

                    <h3>
                      Simulated WhatsApp Notification
                    </h3>
                  </div>

                  <span className="simulated-badge">
                    SIMULATED
                  </span>
                </div>

                <div className="notification-grid">
                  <div>
                    <span>Channel</span>

                    <strong>
                      {
                        selectedPayment
                          .whatsapp_notification
                          .channel
                      }
                    </strong>
                  </div>

                  <div>
                    <span>Mode</span>

                    <strong>
                      {
                        selectedPayment
                          .whatsapp_notification
                          .mode
                      }
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>

                    <strong>
                      {
                        selectedPayment
                          .whatsapp_notification
                          .status
                      }
                    </strong>
                  </div>
                </div>

                <div className="notification-message">
                  <span>MESSAGE</span>

                  <p>
                    {
                      selectedPayment
                        .whatsapp_notification
                        .message
                    }
                  </p>
                </div>

                <div className="recommended-action">
                  <span>
                    RECOMMENDED ACTION
                  </span>

                  <strong>
                    {
                      selectedPayment
                        .whatsapp_notification
                        .recommended_action
                    }
                  </strong>
                </div>
              </div>
            )}
          </section>
        )}

        {/* FOOTER */}

        <footer className="footer">
          <div className="footer-brand">
            <div className="footer-icon">
              <Icon
                name="shield"
                size={15}
              />
            </div>

            <strong>PayRescue</strong>
          </div>

          <span>
            AI-assisted payment recovery • Explainable
            decisions • Safety-first operations
          </span>

          <span className="footer-status">
            <span></span>
            Local Environment
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;