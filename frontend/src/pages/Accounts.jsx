
import { useCallback, useEffect, useState } from "react";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    Wallet,
    RefreshCw,
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
        ? new Date(value).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        : "—";

export default function Accounts() {
    const [accounts, setAccounts] = useState([]);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 1,
    });
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/accounts", {
                params: {
                    page,
                    limit: PAGE_SIZE,
                    ...(search.trim() ? { search: search.trim() } : {}),
                    ...(status ? { status } : {}),
                },
            });

            const payload = response.data?.data;
            const rows = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.accounts)
                    ? payload.accounts
                    : [];

            const meta = response.data?.pagination || payload?.pagination || {};
            const total = Number(meta.total ?? meta.totalRecords ?? rows.length);

            setAccounts(rows);
            setPagination({
                total,
                totalPages: Number(
                    meta.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE))
                ),
            });
        } catch (err) {
            setAccounts([]);
            setError(
                err.response?.data?.message ||
                "Unable to load accounts. Check that the backend is running."
            );
        } finally {
            setLoading(false);
        }
    }, [page, search, status]);

    useEffect(() => {
        const timer = setTimeout(fetchAccounts, 250);
        return () => clearTimeout(timer);
    }, [fetchAccounts]);

    const openAccount = async (account) => {
        try {
            const response = await api.get(`/accounts/${account.accountId}`);
            setSelectedAccount(response.data?.data || account);
        } catch {
            setSelectedAccount(account);
        }
    };

    return (
        <section className="accounts-page">
            <div className="accounts-heading">
                <div>
                    <div className="page-eyebrow">ACCOUNT MANAGEMENT</div>
                    <h1>Accounts</h1>
                    <p>Monitor account status, balances, and customer relationships.</p>
                </div>

                <button
                    className="accounts-refresh"
                    onClick={fetchAccounts}
                    disabled={loading}
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            <div className="accounts-summary">
                <div className="accounts-summary-icon">
                    <Wallet size={21} />
                </div>
                <div>
                    <span>Total accounts</span>
                    <strong>{pagination.total.toLocaleString("en-IN")}</strong>
                </div>
            </div>

            <div className="accounts-toolbar">
                <div className="accounts-search">
                    <Search size={17} />
                    <input
                        type="search"
                        placeholder="Search account ID or customer ID..."
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                    />
                    {search && (
                        <button onClick={() => setSearch("")} aria-label="Clear search">
                            <X size={15} />
                        </button>
                    )}
                </div>

                <select
                    className="accounts-status-filter"
                    value={status}
                    onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="DORMANT">Dormant</option>
                    <option value="CLOSED">Closed</option>
                </select>

                <span className="accounts-count">
                    {accounts.length} records shown
                </span>
            </div>

            <div className="accounts-table-card">
                <div className="accounts-table-scroll">
                    <table className="accounts-table">
                        <thead>
                            <tr>
                                <th>Account ID</th>
                                <th>Customer ID</th>
                                <th>Account Type</th>
                                <th>Balance</th>
                                <th>Status</th>
                                <th>Opened</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="accounts-message">
                                        Loading account records...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="7" className="accounts-message error">
                                        {error}
                                    </td>
                                </tr>
                            ) : accounts.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="accounts-message">
                                        No accounts found.
                                    </td>
                                </tr>
                            ) : (
                                accounts.map((account) => (
                                    <tr key={account.accountId}>
                                        <td className="account-id">{account.accountId}</td>
                                        <td>{account.customerId || "—"}</td>
                                        <td>{account.accountType || account.type || "—"}</td>
                                        <td className="account-balance">
                                            {formatMoney(account.balance)}
                                        </td>
                                        <td>
                                            <span
                                                className={`account-status ${String(
                                                    account.status || "UNKNOWN"
                                                ).toLowerCase()}`}
                                            >
                                                {account.status || "UNKNOWN"}
                                            </span>
                                        </td>
                                        <td>{formatDate(account.createdAt || account.openedAt)}</td>
                                        <td>
                                            <button
                                                className="account-view-button"
                                                onClick={() => openAccount(account)}
                                                aria-label={`View ${account.accountId}`}
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

                <div className="accounts-pagination">
                    <span>
                        Page {page} of {Math.max(1, pagination.totalPages)}
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

            {selectedAccount && (
                <div
                    className="account-modal-backdrop"
                    onClick={() => setSelectedAccount(null)}
                >
                    <section
                        className="account-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="account-modal-header">
                            <div>
                                <div className="page-eyebrow">ACCOUNT PROFILE</div>
                                <h2>Account details</h2>
                            </div>
                            <button
                                onClick={() => setSelectedAccount(null)}
                                aria-label="Close details"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <div className="account-profile">
                            <div className="accounts-summary-icon">
                                <Wallet size={23} />
                            </div>
                            <div>
                                <h3>{selectedAccount.accountId}</h3>
                                <span>{selectedAccount.customerId}</span>
                            </div>
                        </div>

                        <div className="account-detail-grid">
                            <div>
                                <span>Account type</span>
                                <strong>
                                    {selectedAccount.accountType || selectedAccount.type || "—"}
                                </strong>
                            </div>
                            <div>
                                <span>Balance</span>
                                <strong>{formatMoney(selectedAccount.balance)}</strong>
                            </div>
                            <div>
                                <span>Status</span>
                                <strong>{selectedAccount.status || "—"}</strong>
                            </div>
                            <div>
                                <span>Currency</span>
                                <strong>{selectedAccount.currency || "INR"}</strong>
                            </div>
                            <div>
                                <span>Opened</span>
                                <strong>
                                    {formatDate(selectedAccount.createdAt || selectedAccount.openedAt)}
                                </strong>
                            </div>
                            <div>
                                <span>Overdraft limit</span>
                                <strong>{formatMoney(selectedAccount.overdraftLimit)}</strong>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
}
