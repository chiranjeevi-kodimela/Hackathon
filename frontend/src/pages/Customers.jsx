
import { useCallback, useEffect, useState } from "react";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    Users,
    RefreshCw,
} from "lucide-react";
import api from "../services/api";

const PAGE_SIZE = 10;

function getInitials(customer) {
    return `${customer.firstName?.[0] || ""}${customer.lastName?.[0] || ""}`.toUpperCase() || "CU";
}

function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function getKycClass(status) {
    return String(status || "UNKNOWN").toLowerCase();
}

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 1,
    });
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchCustomers = useCallback(async (currentPage = page, currentSearch = search) => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/customers", {
                params: {
                    page: currentPage,
                    limit: PAGE_SIZE,
                    ...(currentSearch.trim() ? { search: currentSearch.trim() } : {}),
                },
            });

            const payload = response.data?.data;
            const rows = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.customers)
                    ? payload.customers
                    : [];

            const meta = response.data?.pagination || payload?.pagination || {};

            setCustomers(rows);
            setPagination({
                total: Number(meta.total ?? meta.totalRecords ?? rows.length),
                totalPages: Number(
                    meta.totalPages ??
                    Math.max(1, Math.ceil(Number(meta.total ?? rows.length) / PAGE_SIZE))
                ),
            });
        } catch (err) {
            setCustomers([]);
            setError(
                err.response?.data?.message ||
                "Unable to load customers. Check that the backend is running."
            );
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers();
        }, 250);

        return () => clearTimeout(timer);
    }, [fetchCustomers]);

    const openCustomer = async (customer) => {
        try {
            const response = await api.get(`/customers/${customer.customerId}`);
            setSelectedCustomer(response.data?.data || customer);
        } catch {
            setSelectedCustomer(customer);
        }
    };

    return (
        <section className="customers-page">
            <div className="customers-heading">
                <div>
                    <div className="page-eyebrow">CUSTOMER MANAGEMENT</div>
                    <h1>Customers</h1>
                    <p>Review customer profiles and KYC verification status.</p>
                </div>

                <button
                    className="customers-refresh"
                    onClick={fetchCustomers}
                    disabled={loading}
                >
                    <RefreshCw size={16} className={loading ? "spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="customers-summary">
                <div className="customers-summary-icon">
                    <Users size={21} />
                </div>
                <div>
                    <span>Total customers</span>
                    <strong>{pagination.total.toLocaleString("en-IN")}</strong>
                </div>
            </div>

            <div className="customers-toolbar">
                <div className="customers-search">
                    <Search size={17} />
                    <input
                        type="search"
                        placeholder="Search by customer ID, name or email..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    {search && (
                        <button
                            aria-label="Clear search"
                            onClick={() => setSearch("")}
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>
                <span className="customers-count">
                    {customers.length} records shown
                </span>
            </div>

            <div className="customers-table-card">
                <div className="customers-table-scroll">
                    <table className="customers-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Customer ID</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>KYC Status</th>
                                <th>Registered</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="customers-message">
                                        Loading customer records...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="7" className="customers-message error">
                                        {error}
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="customers-message">
                                        No customers found.
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer) => (
                                    <tr key={customer.customerId}>
                                        <td>
                                            <div className="customer-identity">
                                                <div className="customer-avatar">
                                                    {getInitials(customer)}
                                                </div>
                                                <strong>
                                                    {customer.firstName} {customer.lastName}
                                                </strong>
                                            </div>
                                        </td>
                                        <td className="customer-id">{customer.customerId}</td>
                                        <td>{customer.email || "—"}</td>
                                        <td>{customer.phone || "—"}</td>
                                        <td>
                                            <span className={`kyc-badge ${getKycClass(customer.kycStatus)}`}>
                                                {customer.kycStatus || "UNKNOWN"}
                                            </span>
                                        </td>
                                        <td>{formatDate(customer.createdAt)}</td>
                                        <td>
                                            <button
                                                className="customer-view-button"
                                                onClick={() => openCustomer(customer)}
                                                aria-label={`View ${customer.firstName}'s details`}
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

                <div className="customers-pagination">
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

            {selectedCustomer && (
                <div
                    className="customer-modal-backdrop"
                    onClick={() => setSelectedCustomer(null)}
                >
                    <section
                        className="customer-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="customer-modal-header">
                            <div>
                                <span className="page-eyebrow">CUSTOMER PROFILE</span>
                                <h2>Customer details</h2>
                            </div>
                            <button
                                onClick={() => setSelectedCustomer(null)}
                                aria-label="Close details"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <div className="customer-profile">
                            <div className="customer-avatar large">
                                {getInitials(selectedCustomer)}
                            </div>
                            <div>
                                <h3>
                                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                                </h3>
                                <span>{selectedCustomer.customerId}</span>
                            </div>
                        </div>

                        <div className="customer-detail-grid">
                            <div>
                                <span>Email</span>
                                <strong>{selectedCustomer.email || "—"}</strong>
                            </div>
                            <div>
                                <span>Phone</span>
                                <strong>{selectedCustomer.phone || "—"}</strong>
                            </div>
                            <div>
                                <span>KYC status</span>
                                <strong>{selectedCustomer.kycStatus || "UNKNOWN"}</strong>
                            </div>
                            <div>
                                <span>Date of birth</span>
                                <strong>{formatDate(selectedCustomer.dateOfBirth)}</strong>
                            </div>
                            <div>
                                <span>City</span>
                                <strong>{selectedCustomer.city || "—"}</strong>
                            </div>
                            <div>
                                <span>State</span>
                                <strong>{selectedCustomer.state || "—"}</strong>
                            </div>
                            <div>
                                <span>Registered</span>
                                <strong>{formatDate(selectedCustomer.createdAt)}</strong>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
}
