
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Search,
    RefreshCw,
    History,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import api from "../services/api";

const PAGE_SIZE = 12;

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

export default function AuditLog() {
    const [events, setEvents] = useState([]);
    const [search, setSearch] = useState("");
    const [targetType, setTargetType] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/audit/events");
            const payload = response.data?.data;
            setEvents(getRows(payload, "events"));
        } catch (err) {
            setEvents([]);
            setError(
                err.response?.data?.message || "Unable to load audit events."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(fetchEvents, 200);
        return () => clearTimeout(timer);
    }, [fetchEvents]);

    const filteredEvents = useMemo(() => {
        const term = search.trim().toLowerCase();

        return events.filter((event) => {
            const matchesSearch =
                !term ||
                [
                    event.targetId,
                    event.actionId,
                    event.analystId,
                    event.actionType,
                    event.eventType,
                    event.notes,
                ]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(term));

            const type = event.targetType || event.entityType || "";
            const matchesType = !targetType || type === targetType;

            return matchesSearch && matchesType;
        });
    }, [events, search, targetType]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredEvents.length / PAGE_SIZE)
    );

    const visibleEvents = filteredEvents.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    );

    return (
        <section className="audit-page">
            <div className="audit-heading">
                <div>
                    <div className="page-eyebrow">GOVERNANCE & TRACEABILITY</div>
                    <h1>Audit Log</h1>
                    <p>Review recorded analyst decisions and system audit events.</p>
                </div>

                <button
                    className="audit-refresh"
                    onClick={fetchEvents}
                    disabled={loading}
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            <div className="audit-stats">
                <div className="audit-stat-icon">
                    <History size={22} />
                </div>
                <div>
                    <span>Total audit events</span>
                    <strong>{events.length.toLocaleString("en-IN")}</strong>
                </div>
                <div className="audit-stat-divider" />
                <div className="audit-stat-icon verified">
                    <ShieldCheck size={22} />
                </div>
                <div>
                    <span>Matching events</span>
                    <strong>{filteredEvents.length.toLocaleString("en-IN")}</strong>
                </div>
            </div>

            <div className="audit-filters">
                <div className="audit-search">
                    <Search size={17} />
                    <input
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Search target, analyst, action or notes..."
                    />
                </div>

                <select
                    value={targetType}
                    onChange={(event) => {
                        setTargetType(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All target types</option>
                    <option value="ALERT">Alert</option>
                    <option value="CASE">Case</option>
                </select>

                <button
                    className="audit-clear"
                    onClick={() => {
                        setSearch("");
                        setTargetType("");
                        setPage(1);
                    }}
                >
                    Clear filters
                </button>
            </div>

            <div className="audit-table-card">
                <div className="audit-table-scroll">
                    <table className="audit-table">
                        <thead>
                            <tr>
                                <th>Event / Action ID</th>
                                <th>Target</th>
                                <th>Action</th>
                                <th>Analyst</th>
                                <th>Notes</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="audit-message">
                                        Loading audit events...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="6" className="audit-message error">
                                        {error}
                                    </td>
                                </tr>
                            ) : visibleEvents.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="audit-message">
                                        No audit events found.
                                    </td>
                                </tr>
                            ) : (
                                visibleEvents.map((event, index) => (
                                    <tr key={event.eventId || event.actionId || index}>
                                        <td className="audit-id">
                                            {event.eventId || event.actionId || "—"}
                                        </td>
                                        <td>
                                            <div className="audit-target">
                                                <strong>
                                                    {event.targetId || event.entityId || "—"}
                                                </strong>
                                                <span>
                                                    {event.targetType || event.entityType || "—"}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="audit-action">
                                                {String(
                                                    event.actionType || event.eventType || "EVENT"
                                                ).replaceAll("_", " ")}
                                            </span>
                                        </td>
                                        <td>{event.analystId || "SYSTEM"}</td>
                                        <td className="audit-notes">
                                            {event.notes || event.description || "—"}
                                        </td>
                                        <td>{formatDate(event.createdAt || event.timestamp)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="audit-pagination">
                    <span>
                        {filteredEvents.length.toLocaleString("en-IN")} events · Page{" "}
                        {page} of {totalPages}
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
                                setPage((current) => Math.min(totalPages, current + 1))
                            }
                            disabled={page >= totalPages || loading}
                            aria-label="Next page"
                        >
                            <ChevronRight size={17} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
