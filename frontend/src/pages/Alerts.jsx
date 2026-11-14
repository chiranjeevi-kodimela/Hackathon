
import { useCallback, useEffect, useState } from "react";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    RefreshCw,
    ShieldAlert,
    AlertTriangle,
    CheckCircle,
    Ban,
    ArrowUpRight,
} from "lucide-react";
import api from "../services/api";

const PAGE_SIZE = 10;

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : "—";

const getRules = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

export default function Alerts() {
    const [alerts, setAlerts] = useState([]);
    const [accountId, setAccountId] = useState("");
    const [severity, setSeverity] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 1,
    });
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [actionType, setActionType] = useState("");
    const [notes, setNotes] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/alerts", {
                params: {
                    page,
                    limit: PAGE_SIZE,
                    ...(accountId.trim() ? { accountId: accountId.trim() } : {}),
                    ...(severity ? { severity } : {}),
                    ...(status ? { status } : {}),
                },
            });

            const payload = response.data?.data;
            const rows = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.alerts)
                    ? payload.alerts
                    : [];

            const meta = response.data?.pagination || payload?.pagination || {};
            const total = Number(meta.total ?? meta.totalRecords ?? rows.length);

            setAlerts(rows);
            setPagination({
                total,
                totalPages: Number(
                    meta.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE))
                ),
            });
        } catch (err) {
            setAlerts([]);
            setError(
                err.response?.data?.message ||
                "Unable to load alerts. Check the backend connection."
            );
        } finally {
            setLoading(false);
        }
    }, [page, accountId, severity, status]);

    useEffect(() => {
        const timer = setTimeout(fetchAlerts, 250);
        return () => clearTimeout(timer);
    }, [fetchAlerts]);

    const openAlert = async (alert) => {
        setActionError("");
        setActionType("");
        setNotes("");

        try {
            const response = await api.get(`/alerts/${alert.alertId}`);
            setSelectedAlert(response.data?.data || alert);
        } catch {
            setSelectedAlert(alert);
        }
    };

    const submitAction = async () => {
        if (!selectedAlert || !actionType || !notes.trim()) {
            setActionError("Select an action and enter investigation notes.");
            return;
        }

        setActionLoading(true);
        setActionError("");

        try {
            await api.post("/audit/actions", {
                targetType: "ALERT",
                targetId: selectedAlert.alertId,
                actionType,
                analystId: "ANALYST-001",
                notes: notes.trim(),
            });

            setSelectedAlert(null);
            setActionType("");
            setNotes("");
            await fetchAlerts();
        } catch (err) {
            setActionError(
                err.response?.data?.message ||
                "Unable to record analyst action. Please try again."
            );
        } finally {
            setActionLoading(false);
        }
    };

    const clearFilters = () => {
        setAccountId("");
        setSeverity("");
        setStatus("");
        setPage(1);
    };

    return (
        <section className="alerts-page">
            <div className="alerts-heading">
                <div>
                    <div className="page-eyebrow">RISK OPERATIONS</div>
                    <h1>Alerts</h1>
                    <p>Review suspicious activity and record investigation decisions.</p>
                </div>

                <button
                    className="alerts-refresh"
                    onClick={fetchAlerts}
                    disabled={loading}
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            <div className="alerts-summary">
                <div className="alerts-summary-icon">
                    <ShieldAlert size={21} />
                </div>
                <div>
                    <span>Matching alerts</span>
                    <strong>{pagination.total.toLocaleString("en-IN")}</strong>
                </div>
            </div>

            <div className="alerts-filters">
                <div className="alerts-search">
                    <Search size={17} />
                    <input
                        placeholder="Filter by account ID..."
                        value={accountId}
                        onChange={(event) => {
                            setAccountId(event.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                <select
                    value={severity}
                    onChange={(event) => {
                        setSeverity(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All severities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                </select>

                <select
                    value={status}
                    onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="ESCALATED">Escalated</option>
                    <option value="DISMISSED">Dismissed</option>
                    <option value="RESOLVED">Resolved</option>
                </select>

                <button className="alerts-clear" onClick={clearFilters}>
                    Clear filters
                </button>
            </div>

            <div className="alerts-table-card">
                <div className="alerts-table-scroll">
                    <table className="alerts-table">
                        <thead>
                            <tr>
                                <th>Alert ID</th>
                                <th>Account ID</th>
                                <th>Transaction ID</th>
                                <th>Severity</th>
                                <th>Risk score</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="alerts-message">
                                        Loading alerts...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="8" className="alerts-message error">
                                        {error}
                                    </td>
                                </tr>
                            ) : alerts.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="alerts-message">
                                        No alerts match these filters.
                                    </td>
                                </tr>
                            ) : (
                                alerts.map((alert) => (
                                    <tr key={alert.alertId}>
                                        <td className="alert-id">{alert.alertId}</td>
                                        <td>{alert.accountId || "—"}</td>
                                        <td>{alert.transactionId || "—"}</td>
                                        <td>
                                            <span
                                                className={`alert-severity ${String(
                                                    alert.severity || "UNKNOWN"
                                                ).toLowerCase()}`}
                                            >
                                                {alert.severity || "UNKNOWN"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="alert-score">
                                                <strong>{alert.riskScore ?? 0}</strong>
                                                <span>/100</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={`alert-status ${String(
                                                    alert.status || "UNKNOWN"
                                                ).toLowerCase()}`}
                                            >
                                                {alert.status || "UNKNOWN"}
                                            </span>
                                        </td>
                                        <td>{formatDate(alert.createdAt)}</td>
                                        <td>
                                            <button
                                                className="alert-view-button"
                                                onClick={() => openAlert(alert)}
                                                aria-label={`Inspect ${alert.alertId}`}
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="alerts-pagination">
                    <span>
                        {pagination.total.toLocaleString("en-IN")} total alerts · Page{" "}
                        {page} of {Math.max(1, pagination.totalPages)}
                    </span>
                    <div>
                        <button
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page <= 1 || loading}
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={17} />
                        </button>
                        <button
                            onClick={() =>
                                setPage((current) =>
                                    Math.min(pagination.totalPages, current + 1)
                                )
                            }
                            disabled={page >= pagination.totalPages || loading}
                            aria-label="Next page"
                        >
                            <ChevronRight size={17} />
                        </button>
                    </div>
                </div>
            </div>

            {selectedAlert && (
                <div
                    className="alert-modal-backdrop"
                    onClick={() => setSelectedAlert(null)}
                >
                    <section
                        className="alert-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="alert-modal-header">
                            <div>
                                <div className="page-eyebrow">ALERT INVESTIGATION</div>
                                <h2>Alert details</h2>
                            </div>
                            <button
                                onClick={() => setSelectedAlert(null)}
                                aria-label="Close details"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <div className="alert-profile">
                            <div className="alert-profile-icon">
                                <AlertTriangle size={22} />
                            </div>
                            <div>
                                <h3>{selectedAlert.alertId}</h3>
                                <span>
                                    {selectedAlert.severity} severity · Risk score{" "}
                                    {selectedAlert.riskScore}/100
                                </span>
                            </div>
                        </div>

                        <div className="alert-detail-grid">
                            <div>
                                <span>Account ID</span>
                                <strong>{selectedAlert.accountId || "—"}</strong>
                            </div>
                            <div>
                                <span>Transaction ID</span>
                                <strong>{selectedAlert.transactionId || "—"}</strong>
                            </div>
                            <div>
                                <span>Status</span>
                                <strong>{selectedAlert.status || "—"}</strong>
                            </div>
                            <div>
                                <span>Created</span>
                                <strong>{formatDate(selectedAlert.createdAt)}</strong>
                            </div>
                        </div>

                        <div className="alert-rules-section">
                            <h4>Triggered rules</h4>
                            {getRules(selectedAlert.triggeredRules).length > 0 ? (
                                <div className="alert-rules-list">
                                    {getRules(selectedAlert.triggeredRules).map((rule, index) => (
                                        <div key={rule.ruleId || rule.id || index}>
                                            <span>{rule.ruleId || rule.id || `Rule ${index + 1}`}</span>
                                            <strong>
                                                {rule.ruleName || rule.name || rule.description || "Triggered risk rule"}
                                            </strong>
                                            {rule.points != null && <small>+{rule.points} points</small>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="alert-no-rules">
                                    No triggered rule details are available in this record.
                                </p>
                            )}
                        </div>

                        <div className="alert-action-section">
                            <h4>Record analyst decision</h4>

                            {["OPEN", "ESCALATED"].includes(selectedAlert.status) ? (
                                <>
                                    <div className="alert-action-buttons">
                                        <button
                                            className={`alert-action-button escalate ${actionType === "ESCALATE_ALERT" ? "selected" : ""
                                                }`}
                                            onClick={() => setActionType("ESCALATE_ALERT")}
                                        >
                                            <ArrowUpRight size={16} />
                                            Escalate
                                        </button>
                                        <button
                                            className={`alert-action-button dismiss ${actionType === "DISMISS_ALERT" ? "selected" : ""
                                                }`}
                                            onClick={() => setActionType("DISMISS_ALERT")}
                                        >
                                            <Ban size={16} />
                                            Dismiss
                                        </button>
                                    </div>

                                    <textarea
                                        value={notes}
                                        onChange={(event) => setNotes(event.target.value)}
                                        placeholder="Explain the investigation decision..."
                                        rows={3}
                                    />

                                    {actionError && (
                                        <p className="alert-action-error">{actionError}</p>
                                    )}

                                    <button
                                        className="alert-submit-action"
                                        onClick={submitAction}
                                        disabled={actionLoading || !actionType || !notes.trim()}
                                    >
                                        {actionLoading ? "Saving decision..." : "Submit decision"}
                                    </button>
                                </>
                            ) : (
                                <p className="alert-closed-message">
                                    <CheckCircle size={16} />
                                    This alert is no longer open for analyst action.
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
}
