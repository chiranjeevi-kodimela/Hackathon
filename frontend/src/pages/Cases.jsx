
import { useCallback, useEffect, useState } from "react";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    RefreshCw,
    BriefcaseBusiness,
    Clock3,
    CheckCircle,
    RotateCcw,
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

const getRows = (payload, key) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.[key])) return payload[key];
    return [];
};

export default function Cases() {
    const [cases, setCases] = useState([]);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 1,
    });
    const [selectedCase, setSelectedCase] = useState(null);
    const [history, setHistory] = useState([]);
    const [notes, setNotes] = useState("");
    const [actionType, setActionType] = useState("");
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");

    const fetchCases = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/cases", {
                params: {
                    page,
                    limit: PAGE_SIZE,
                    ...(search.trim() ? { accountId: search.trim() } : {}),
                    ...(status ? { status } : {}),
                },
            });

            const payload = response.data?.data;
            const rows = getRows(payload, "cases");
            const meta = response.data?.pagination || payload?.pagination || {};
            const total = Number(meta.total ?? meta.totalRecords ?? rows.length);

            setCases(rows);
            setPagination({
                total,
                totalPages: Number(
                    meta.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE))
                ),
            });
        } catch (err) {
            setCases([]);
            setError(
                err.response?.data?.message || "Unable to load cases."
            );
        } finally {
            setLoading(false);
        }
    }, [page, search, status]);

    useEffect(() => {
        const timer = setTimeout(fetchCases, 250);
        return () => clearTimeout(timer);
    }, [fetchCases]);

    const openCase = async (item) => {
        setDetailLoading(true);
        setActionError("");
        setNotes("");
        setActionType("");

        try {
            const [caseResponse, historyResponse] = await Promise.all([
                api.get(`/cases/${item.caseId}`),
                api.get("/audit/actions", {
                    params: { targetId: item.caseId },
                }),
            ]);

            setSelectedCase(caseResponse.data?.data || item);
            setHistory(
                getRows(historyResponse.data?.data, "actions")
            );
        } catch  {
            try {
                const response = await api.get(`/cases/${item.caseId}`);
                setSelectedCase(response.data?.data || item);
            } catch {
                setSelectedCase(item);
            }
            setHistory([]);
        } finally {
            setDetailLoading(false);
        }
    };

    const submitAction = async () => {
        if (!selectedCase || !actionType || !notes.trim()) {
            setActionError("Choose an action and enter investigation notes.");
            return;
        }

        setActionLoading(true);
        setActionError("");

        try {
            await api.post("/audit/actions", {
                targetType: "CASE",
                targetId: selectedCase.caseId,
                actionType,
                analystId: "ANALYST-001",
                notes: notes.trim(),
            });

            const [caseResponse, historyResponse] = await Promise.all([
                api.get(`/cases/${selectedCase.caseId}`),
                api.get("/audit/actions", {
                    params: { targetId: selectedCase.caseId },
                }),
            ]);

            setSelectedCase(caseResponse.data?.data || selectedCase);
            setHistory(getRows(historyResponse.data?.data, "actions"));
            setNotes("");
            setActionType("");
            await fetchCases();
        } catch (err) {
            setActionError(
                err.response?.data?.message || "Unable to record this action."
            );
        } finally {
            setActionLoading(false);
        }
    };

    const linkedAlerts = Array.isArray(selectedCase?.alerts)
        ? selectedCase.alerts
        : [];

    const clearFilters = () => {
        setSearch("");
        setStatus("");
        setPage(1);
    };

    return (
        <section className="cases-page">
            <div className="cases-heading">
                <div>
                    <div className="page-eyebrow">RISK OPERATIONS</div>
                    <h1>Case Management</h1>
                    <p>Investigate related alerts and record case decisions.</p>
                </div>

                <button
                    className="cases-refresh"
                    onClick={fetchCases}
                    disabled={loading}
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            <div className="cases-summary">
                <div className="cases-summary-icon">
                    <BriefcaseBusiness size={21} />
                </div>
                <div>
                    <span>Matching cases</span>
                    <strong>{pagination.total.toLocaleString("en-IN")}</strong>
                </div>
            </div>

            <div className="cases-filters">
                <div className="cases-search">
                    <Search size={17} />
                    <input
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Filter by account ID..."
                    />
                </div>

                <select
                    value={status}
                    onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_REVIEW">In review</option>
                    <option value="ESCALATED">Escalated</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                </select>

                <button className="cases-clear" onClick={clearFilters}>
                    Clear filters
                </button>
            </div>

            <div className="cases-table-card">
                <div className="cases-table-scroll">
                    <table className="cases-table">
                        <thead>
                            <tr>
                                <th>Case ID</th>
                                <th>Account ID</th>
                                <th>Alerts</th>
                                <th>Highest severity</th>
                                <th>Highest risk</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="cases-message">
                                        Loading cases...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="8" className="cases-message error">
                                        {error}
                                    </td>
                                </tr>
                            ) : cases.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="cases-message">
                                        No cases match these filters.
                                    </td>
                                </tr>
                            ) : (
                                cases.map((item) => (
                                    <tr key={item.caseId}>
                                        <td className="case-id">{item.caseId}</td>
                                        <td>{item.accountId || "—"}</td>
                                        <td>{item.totalAlerts ?? item.alerts?.length ?? 0}</td>
                                        <td>
                                            <span
                                                className={`case-severity ${String(
                                                    item.highestSeverity || item.priority || "unknown"
                                                ).toLowerCase()}`}
                                            >
                                                {item.highestSeverity || item.priority || "—"}
                                            </span>
                                        </td>
                                        <td>{item.highestRiskScore ?? "—"}</td>
                                        <td>
                                            <span
                                                className={`case-status ${String(
                                                    item.status || "unknown"
                                                ).toLowerCase()}`}
                                            >
                                                {String(item.status || "UNKNOWN").replaceAll("_", " ")}
                                            </span>
                                        </td>
                                        <td>{formatDate(item.createdAt)}</td>
                                        <td>
                                            <button
                                                className="case-view-button"
                                                onClick={() => openCase(item)}
                                                aria-label={`Inspect ${item.caseId}`}
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

                <div className="cases-pagination">
                    <span>
                        {pagination.total.toLocaleString("en-IN")} total cases · Page{" "}
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

            {selectedCase && (
                <div
                    className="case-modal-backdrop"
                    onClick={() => setSelectedCase(null)}
                >
                    <section
                        className="case-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="case-modal-header">
                            <div>
                                <div className="page-eyebrow">CASE INVESTIGATION</div>
                                <h2>{selectedCase.caseId}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedCase(null)}
                                aria-label="Close case"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        {detailLoading ? (
                            <p className="cases-message">Loading case details...</p>
                        ) : (
                            <>
                                <div className="case-detail-grid">
                                    <div>
                                        <span>Account ID</span>
                                        <strong>{selectedCase.accountId || "—"}</strong>
                                    </div>
                                    <div>
                                        <span>Status</span>
                                        <strong>{selectedCase.status || "—"}</strong>
                                    </div>
                                    <div>
                                        <span>Linked alerts</span>
                                        <strong>
                                            {selectedCase.totalAlerts ?? linkedAlerts.length}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>Highest risk score</span>
                                        <strong>{selectedCase.highestRiskScore ?? "—"}</strong>
                                    </div>
                                    <div>
                                        <span>Created</span>
                                        <strong>{formatDate(selectedCase.createdAt)}</strong>
                                    </div>
                                    <div>
                                        <span>Resolved</span>
                                        <strong>{formatDate(selectedCase.resolvedAt)}</strong>
                                    </div>
                                </div>

                                <div className="case-section">
                                    <h4>Linked alerts</h4>
                                    {linkedAlerts.length > 0 ? (
                                        <div className="case-linked-alerts">
                                            {linkedAlerts.map((entry, index) => {
                                                const alert = entry.alert || entry;
                                                return (
                                                    <div key={alert.alertId || index}>
                                                        <strong>{alert.alertId || "Alert"}</strong>
                                                        <span>{alert.severity || "—"}</span>
                                                        <span>Risk {alert.riskScore ?? "—"}</span>
                                                        <span>{alert.status || "—"}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="case-empty">
                                            No linked alert details are available.
                                        </p>
                                    )}
                                </div>

                                <div className="case-section">
                                    <h4>Analyst action history</h4>
                                    {history.length > 0 ? (
                                        <div className="case-history">
                                            {history.map((entry, index) => (
                                                <div key={entry.actionId || index}>
                                                    <div>
                                                        <strong>
                                                            {String(entry.actionType || "ACTION").replaceAll(
                                                                "_",
                                                                " "
                                                            )}
                                                        </strong>
                                                        <span>{formatDate(entry.createdAt)}</span>
                                                    </div>
                                                    <p>{entry.notes || "No notes provided."}</p>
                                                    <small>Analyst: {entry.analystId || "—"}</small>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="case-empty">
                                            No analyst actions recorded for this case yet.
                                        </p>
                                    )}
                                </div>

                                <div className="case-section">
                                    <h4>Record case action</h4>

                                    <div className="case-action-buttons">
                                        {selectedCase.status === "RESOLVED" ||
                                            selectedCase.status === "CLOSED" ? (
                                            <button
                                                className={`case-action-button reopen ${actionType === "REOPEN_CASE" ? "selected" : ""
                                                    }`}
                                                onClick={() => setActionType("REOPEN_CASE")}
                                            >
                                                <RotateCcw size={16} />
                                                Reopen case
                                            </button>
                                        ) : (
                                            <button
                                                className={`case-action-button resolve ${actionType === "RESOLVE_CASE" ? "selected" : ""
                                                    }`}
                                                onClick={() => setActionType("RESOLVE_CASE")}
                                            >
                                                <CheckCircle size={16} />
                                                Resolve case
                                            </button>
                                        )}

                                        <button
                                            className={`case-action-button note ${actionType === "ADD_NOTE" ? "selected" : ""
                                                }`}
                                            onClick={() => setActionType("ADD_NOTE")}
                                        >
                                            <Clock3 size={16} />
                                            Add note
                                        </button>
                                    </div>

                                    <textarea
                                        rows={3}
                                        value={notes}
                                        onChange={(event) => setNotes(event.target.value)}
                                        placeholder="Enter investigation notes..."
                                    />

                                    {actionError && (
                                        <p className="case-action-error">{actionError}</p>
                                    )}

                                    <button
                                        className="case-submit-action"
                                        onClick={submitAction}
                                        disabled={actionLoading || !actionType || !notes.trim()}
                                    >
                                        {actionLoading ? "Saving action..." : "Submit action"}
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            )}
        </section>
    );
}
