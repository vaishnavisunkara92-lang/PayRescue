import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [showForm, setShowForm] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [payments, setPayments] = useState([]);

  const [analytics, setAnalytics] = useState({
    total_failed_payments: 0,
    total_failed_amount: 0,
    high_priority_payments: 0,
    recovered_payments: 0,
    recovery_rate: 0,
    failure_breakdown: {},
    priority_breakdown: {},
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

  const loadData = async () => {
    try {
      const paymentsResponse = await fetch(
        "http://127.0.0.1:8000/payments"
      );

      if (!paymentsResponse.ok) {
        throw new Error("Could not load payments");
      }

      const paymentsData = await paymentsResponse.json();
      const formattedPayments = (paymentsData.payments || []).map(
  (payment) => ({
    ...payment,
    whatsapp_notification:
      typeof payment.whatsapp_notification === "string"
        ? JSON.parse(payment.whatsapp_notification)
        : payment.whatsapp_notification,
  })
);

setPayments(formattedPayments);
      const analyticsResponse = await fetch(
        "http://127.0.0.1:8000/analytics"
      );

      if (!analyticsResponse.ok) {
        throw new Error("Could not load analytics");
      }

      const analyticsData = await analyticsResponse.json();
      setAnalytics(analyticsData);
      setError("");
    } catch (err) {
      console.error("Backend connection error:", err);
      setError(
        "Could not connect to PayRescue backend. Make sure backend is running on port 8000."
      );
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
      const response = await fetch(
        "http://127.0.0.1:8000/payments",
        {
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
        }
      );

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

  const handleRecovery = async (paymentId) => {
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/recover/${paymentId}`,
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

      setMessage(data.message);

      await loadData();

      if (data.payment) {
        setSelectedPayment(data.payment);
        setShowAnalysis(true);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleViewAnalysis = (payment) => {
    setSelectedPayment(payment);
    setShowAnalysis(true);
  };

  const recoveredPayments = payments.filter(
    (payment) =>
      payment.recovery_status === "Recovery successful"
  );

  const recoveryRate =
    payments.length > 0
      ? Math.round(
          (recoveredPayments.length / payments.length) * 100
        )
      : 0;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>PayRescue</h1>
          <p>Payment Recovery System</p>
        </div>
      </header>

      <main className="dashboard">
        <section className="welcome">
          <h2>Payment Recovery Dashboard</h2>

          <p>
            Monitor failed payments, analyze failures, and
            manage recovery actions.
          </p>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <h3>Total Failed Payments</h3>

            <p className="stat-value">
              {analytics.total_failed_payments}
            </p>
          </div>

          <div className="stat-card">
            <h3>Total Failed Amount</h3>

            <p className="stat-value">
              ₹{analytics.total_failed_amount}
            </p>
          </div>

          <div className="stat-card">
            <h3>High Priority Payments</h3>

            <p className="stat-value">
              {analytics.high_priority_payments}
            </p>
          </div>

          <div className="stat-card">
            <h3>Recovery Rate</h3>

            <p className="stat-value">
              {recoveryRate}%
            </p>
          </div>
        </section>

        <section className="analytics-breakdown">
          <div className="breakdown-card">
            <h3>Failure Breakdown</h3>

            {Object.entries(
              analytics.failure_breakdown || {}
            ).map(([reason, count]) => (
              <div
                className="breakdown-row"
                key={reason}
              >
                <span>
                  {reason.replaceAll("_", " ")}
                </span>

                <strong>{count}</strong>
              </div>
            ))}
          </div>

          <div className="breakdown-card">
            <h3>Priority Breakdown</h3>

            {Object.entries(
              analytics.priority_breakdown || {}
            ).map(([priority, count]) => (
              <div
                className="breakdown-row"
                key={priority}
              >
                <span>{priority}</span>

                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="payments-section">
          <div className="section-header">
            <div>
              <h2>Recent Failed Payments</h2>

              <p>
                Payments that require recovery attention.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setShowForm(
                  (previousValue) => !previousValue
                );

                setError("");
                setMessage("");
              }}
            >
              {showForm
                ? "Close Form"
                : "+ Add Payment"}
            </button>
          </div>

          {showForm && (
            <form
              className="payment-form"
              onSubmit={handleSubmit}
            >
              <h2>Add Failed Payment</h2>

              <p className="form-description">
                Enter the payment details below.
              </p>

              <div className="form-grid">
                <div className="form-group">
                  <label>Payment ID</label>

                  <input
                    type="text"
                    name="payment_id"
                    value={formData.payment_id}
                    onChange={handleChange}
                    placeholder="Example: PAY027"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Amount</label>

                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="Example: 3000"
                    required
                  />
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

              <button
                type="submit"
                className="submit-button"
              >
                Record Payment
              </button>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {message && (
                <div className="success-message">
                  {message}
                </div>
              )}
            </form>
          )}

          {!showForm && error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {!showForm && message && (
            <div className="success-message">
              {message}
            </div>
          )}

          {!showForm &&
            payments.length === 0 &&
            !error && (
              <div className="empty-state">
                <h3>No payments yet</h3>

                <p>
                  Add a failed payment to start analyzing
                  and recovering payments.
                </p>
              </div>
            )}

          {!showForm && payments.length > 0 && (
            <div className="table-container">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Amount</th>
                    <th>Failure Reason</th>
                    <th>Score</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {[...payments]
                    .sort(
                      (a, b) =>
                        Number(b.recovery_score) -
                        Number(a.recovery_score)
                    )
                    .map((payment) => (
                      <tr
                        key={payment.payment_id}
                      >
                        <td>
                          {payment.payment_id}
                        </td>

                        <td>
                          ₹{payment.amount}
                        </td>

                        <td>
                          {payment.failure_reason}
                        </td>

                        <td>
                          {payment.recovery_score}
                        </td>

                        <td>
                          <span
                            className={`priority-badge ${
                              payment.priority
                                ? payment.priority.toLowerCase()
                                : ""
                            }`}
                          >
                            {payment.priority}
                          </span>
                        </td>

                        <td>
                          {payment.recovery_status}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="view-button"
                            onClick={() =>
                              handleViewAnalysis(
                                payment
                              )
                            }
                          >
                            View Analysis
                          </button>

                          {payment.recovery_status ===
                            "Recovery attempt initiated" && (
                            <button
                              type="button"
                              className="recover-button"
                              onClick={() =>
                                handleRecovery(
                                  payment.payment_id
                                )
                              }
                            >
                              Recover
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {showAnalysis && selectedPayment && (
            <div className="analysis-panel">
              <div className="analysis-header">
                <div>
                  <h2>Payment Analysis</h2>

                  <p>
                    {selectedPayment.payment_id}
                  </p>
                </div>

                <button
                  type="button"
                  className="close-button"
                  onClick={() =>
                    setShowAnalysis(false)
                  }
                >
                  Close
                </button>
              </div>

              <div className="analysis-grid">
                <div className="analysis-item">
                  <span>Diagnosis</span>

                  <strong>
                    {selectedPayment.diagnosis}
                  </strong>
                </div>

                <div className="analysis-item">
                  <span>Recovery Score</span>

                  <strong>
                    {selectedPayment.recovery_score}
                  </strong>
                </div>

                <div className="analysis-item">
                  <span>Priority</span>

                  <strong>
                    {selectedPayment.priority}
                  </strong>
                </div>

                <div className="analysis-item">
                  <span>Recovery Action</span>

                  <strong>
                    {selectedPayment.recovery_action}
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

                <div className="analysis-item">
                  <span>AI Explanation</span>

{selectedPayment.whatsapp_notification && (
  <div className="analysis-item">
    <span>📱 Simulated WhatsApp Notification</span>

    <div>
      <p>
        <strong>Channel:</strong>{" "}
        {selectedPayment.whatsapp_notification.channel}
      </p>

      <p>
        <strong>Mode:</strong>{" "}
        {selectedPayment.whatsapp_notification.mode}
      </p>

      <p>
        <strong>Status:</strong>{" "}
        {selectedPayment.whatsapp_notification.status}
      </p>

      <p>
        <strong>Message:</strong>{" "}
        {selectedPayment.whatsapp_notification.message}
      </p>

      <p>
        <strong>Recommended Action:</strong>{" "}
        {selectedPayment.whatsapp_notification.recommended_action}
      </p>
    </div>
  </div>
)}
                  <div>
                    {selectedPayment.ai_explanation ? (
                      <>
                        {selectedPayment.ai_explanation.explanation?.map(
                          (reason, index) => (
                            <p key={index}>
                              • {reason}
                            </p>
                          )
                        )}

                        <strong>
                          {
                            selectedPayment
                              .ai_explanation
                              .decision
                          }
                        </strong>
                      </>
                    ) : (
                      <p>
                        AI explanation not available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;