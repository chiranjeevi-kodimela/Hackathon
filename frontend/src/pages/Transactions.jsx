
import { useCallback, useEffect, useState } from "react";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    RefreshCw,
    ArrowLeftRight,
} from "lucide-react";
import api from "../services/api";

const PAGE_SIZE = 10;

const formatMoney = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(value || 0));

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

export default function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [search, setSearch] = useState("");
    const [type, setType] = useState("");
    const [status, setStatus] = useState("");
    const [minAmount, setMinAmount] = useState("");
    const [maxAmount, setMaxAmount] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 1,
    });
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const params = {
                page,
                limit: PAGE_SIZE,
                ...(search.trim() ? { search: search.trim() } : {}),
                ...(type ? { type } : {}),
                ...(status ? { status } : {}),
                ...(minAmount !== "" ? { minAmount } : {}),
                ...(maxAmount !== "" ? { maxAmount } : {}),
                ...(fromDate ? { fromDate } : {}),
                ...(toDate ? { toDate } : {}),
            };

            const response = await api.get("/transactions", { params });
            const payload = response.data?.data;

            const rows = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.transactions)
                    ? payload.transactions
                    : [];

            const meta = response.data?.pagination || payload?.pagination || {};
            const total = Number(meta.total ?? meta.totalRecords ?? rows.length);

            setTransactions(rows);
            setPagination({
                total,
                totalPages: Number(
                    meta.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE))
                ),
            });
        } catch (err) {
            setTransactions([]);
            setError(
                err.response?.data?.message ||
                "Unable to load transactions. Check the backend connection."
            );
        } finally {
            setLoading(false);
        }
    }, [
        page,
        search,
        type,
        status,
        minAmount,
        maxAmount,
        fromDate,
        toDate,
    ]);

    useEffect(() => {
        const timer = setTimeout(fetchTransactions, 250);
        return () => clearTimeout(timer);
    }, [fetchTransactions]);

    const clearFilters = () => {
        setSearch("");
        setType("");
        setStatus("");
        setMinAmount("");
        setMaxAmount("");
        setFromDate("");
        setToDate("");
        setPage(1);
    };

    const openTransaction = async (transaction) => {
        try {
            const response = await api.get(
                `/transactions/${transaction.transactionId}`
            );
            setSelectedTransaction(response.data?.data || transaction);
        } catch {
            setSelectedTransaction(transaction);
        }
    };

    return (
        <section className="transactions-page">
            <div className="transactions-heading">
                <div>
                    <div className="page-eyebrow">TRANSACTION MONITORING</div>
                    <h1>Transactions</h1>
                    <p>Explore transaction activity and investigate suspicious patterns.</p>
                </div>

                <button
                    className="transactions-refresh"
                    onClick={fetchTransactions}
                    disabled={loading}
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            <div className="transactions-summary">
                <div className="transactions-summary-icon">
                    <ArrowLeftRight size={21} />
                </div>
                <div>
                    <span>Matching transactions</span>
                    <strong>{pagination.total.toLocaleString("en-IN")}</strong>
                </div>
            </div>

            <div className="transactions-filters">
                <div className="transactions-search">
                    <Search size={17} />
                    <input
                        type="search"
                        placeholder="Search transaction ID or account ID..."
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                <select
                    value={type}
                    onChange={(event) => {
                        setType(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All types</option>
                    <option value="CREDIT">Credit</option>
                    <option value="DEBIT">Debit</option>
                    <option value="TRANSFER_IN">Transfer In</option>
                    <option value="TRANSFER_OUT">Transfer Out</option>
                </select>

                <select
                    value={status}
                    onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING">Pending</option>
                    <option value="FAILED">Failed</option>
                </select>

                <button className="transactions-clear" onClick={clearFilters}>
                    Clear filters
                </button>
            </div>

            <div className="transactions-advanced-filters">
                <label>
                    Minimum amount
                    <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={minAmount}
                        onChange={(event) => {
                            setMinAmount(event.target.value);
                            setPage(1);
                        }}
                    />
                </label>

                <label>
                    Maximum amount
                    <input
                        type="number"
                        min="0"
                        placeholder="No limit"
                        value={maxAmount}
                        onChange={(event) => {
                            setMaxAmount(event.target.value);
                            setPage(1);
                        }}
                    />
                </label>

                <label>
                    From date
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(event) => {
                            setFromDate(event.target.value);
                            setPage(1);
                        }}
                    />
                </label>

                <label>
                    To date
                    <input
                        type="date"
                        value={toDate}
                        onChange={(event) => {
                            setToDate(event.target.value);
                            setPage(1);
                        }}
                    />
                </label>
            </div>

            <div className="transactions-table-card">
                <div className="transactions-table-scroll">
                    <table className="transactions-table">
                        <thead>
                            <tr>
                                <th>Transaction ID</th>
                                <th>Account ID</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Timestamp</th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="transactions-message">
                                        Loading transactions...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="7" className="transactions-message error">
                                        {error}
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="transactions-message">
                                        No transactions match these filters.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((transaction) => (
                                    <tr key={transaction.transactionId}>
                                        <td className="transaction-id">
                                            {transaction.transactionId}
                                        </td>
                                        <td>{transaction.accountId}</td>
                                        <td>
                                            <span
                                                className={`transaction-type ${String(
                                                    transaction.type
                                                ).toLowerCase()}`}
                                            >
                                                {transaction.type?.replaceAll("_", " ")}
                                            </span>
                                        </td>
                                        <td className="transaction-amount">
                                            {formatMoney(transaction.amount)}
                                        </td>
                                        <td>
                                            <span
                                                className={`transaction-status ${String(
                                                    transaction.status || "UNKNOWN"
                                                ).toLowerCase()}`}
                                            >
                                                {transaction.status || "UNKNOWN"}
                                            </span>
                                        </td>
                                        <td>
                                            {formatDate(
                                                transaction.timestamp || transaction.createdAt
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="transaction-view-button"
                                                onClick={() => openTransaction(transaction)}
                                                aria-label={`View ${transaction.transactionId}`}
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

                <div className="transactions-pagination">
                    <span>
                        {pagination.total.toLocaleString("en-IN")} total records · Page{" "}
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

            {selectedTransaction && (
                <div
                    className="transaction-modal-backdrop"
                    onClick={() => setSelectedTransaction(null)}
                >
                    <section
                        className="transaction-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="transaction-modal-header">
                            <div>
                                <div className="page-eyebrow">TRANSACTION RECORD</div>
                                <h2>Transaction details</h2>
                            </div>
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                aria-label="Close details"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <h3 className="transaction-modal-id">
                            {selectedTransaction.transactionId}
                        </h3>

                        <div className="transaction-detail-grid">
                            <div>
                                <span>Account ID</span>
                                <strong>{selectedTransaction.accountId || "—"}</strong>
                            </div>
                            <div>
                                <span>Type</span>
                                <strong>{selectedTransaction.type || "—"}</strong>
                            </div>
                            <div>
                                <span>Amount</span>
                                <strong>{formatMoney(selectedTransaction.amount)}</strong>
                            </div>
                            <div>
                                <span>Status</span>
                                <strong>{selectedTransaction.status || "—"}</strong>
                            </div>
                            <div>
                                <span>Balance before</span>
                                <strong>
                                    {formatMoney(selectedTransaction.balanceBefore)}
                                </strong>
                            </div>
                            <div>
                                <span>Balance after</span>
                                <strong>
                                    {formatMoney(selectedTransaction.balanceAfter)}
                                </strong>
                            </div>
                            <div>
                                <span>Merchant ID</span>
                                <strong>{selectedTransaction.merchantId || "—"}</strong>
                            </div>
                            <div>
                                <span>Device ID</span>
                                <strong>{selectedTransaction.deviceId || "—"}</strong>
                            </div>
                            <div>
                                <span>Timestamp</span>
                                <strong>
                                    {formatDate(
                                        selectedTransaction.timestamp ||
                                        selectedTransaction.createdAt
                                    )}
                                </strong>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
}
