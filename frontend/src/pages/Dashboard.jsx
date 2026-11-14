import { useEffect, useState } from "react";
import {
    Users,
    Wallet,
    ArrowLeftRight,
    ShieldAlert,
    RefreshCw,
    Activity,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { getDashboard } from "../services/api";

const COLORS = [
    "var(--color-brand)",
    "var(--color-warning)",
    "var(--color-info)",
    "var(--color-danger)",
];

function MetricCard({ title, value, subtitle, icon: Icon }) {
    return (
        <div className="metric-card">
            <div className="metric-top">
                <span>{title}</span>
                <div className="metric-icon"><Icon size={19} /></div>
            </div>
            <h2>{value ?? "—"}</h2>
            <p>{subtitle}</p>
        </div>
    );
}

function toChartData(value, nameKey) {
    if (Array.isArray(value)) return value;

    if (value && typeof value === "object") {
        return Object.entries(value).map(([name, count]) => ({
            [nameKey]: name,
            count: Number(count),
        }));
    }

    return [];
}

export default function Dashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Initial API request
    useEffect(() => {
        let active = true;

        async function fetchData() {
            try {
                const data = await getDashboard();

                if (active) {
                    setDashboard(data);
                    setError("");
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        "Unable to connect to the RiskLens backend."
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        fetchData();

        return () => {
            active = false;
        };
    }, []);

    // Manual refresh
    async function loadDashboard() {
        try {
            setLoading(true);
            setError("");

            const data = await getDashboard();
            setDashboard(data);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to connect to the RiskLens backend."
            );
        } finally {
            setLoading(false);
        }
    }

    if (loading && !dashboard) {
        return <div className="page-state">Loading RiskLens dashboard...</div>;
    }

    if (error && !dashboard) {
        return (
            <div className="page-state error-state">
                <ShieldAlert size={30} />
                <h3>Dashboard unavailable</h3>
                <p>{error}</p>
                <button className="retry-button" onClick={loadDashboard}>
                    <RefreshCw size={16} /> Retry
                </button>
            </div>
        );
    }

    const totals = dashboard?.totals || {};
    const risk = dashboard?.risk || {};
    const transactionMetrics = dashboard?.transactions || {};
    const accountMetrics = dashboard?.accounts || {};

    const severityData = toChartData(
        risk.severityDistribution,
        "severity"
    );

    const transactionData = toChartData(
        transactionMetrics.typeDistribution,
        "type"
    );

    return (
        <div className="dashboard">
            <div className="page-heading">
                <div>
                    <div className="eyebrow">RISK OPERATIONS / OVERVIEW</div>
                    <h1>Dashboard</h1>
                    <p>Monitor transaction activity and financial risk signals.</p>
                    {error && (
                        <p className="dashboard-refresh-error" role="alert">
                            Refresh failed: {error}. Showing the last loaded data.
                        </p>
                    )}
                </div>

                <button className="refresh-button" onClick={loadDashboard}>
                    <RefreshCw size={15} /> Refresh data
                </button>
            </div>

            <div className="metrics-grid">
                <MetricCard
                    title="Total Customers"
                    value={totals.customers?.toLocaleString("en-IN")}
                    subtitle="Registered customers"
                    icon={Users}
                />

                <MetricCard
                    title="Total Accounts"
                    value={totals.accounts?.toLocaleString("en-IN")}
                    subtitle="Tracked bank accounts"
                    icon={Wallet}
                />

                <MetricCard
                    title="Transactions"
                    value={totals.transactions?.toLocaleString("en-IN")}
                    subtitle="Recorded transactions"
                    icon={ArrowLeftRight}
                />

                <MetricCard
                    title="Risk Alerts"
                    value={totals.alerts?.toLocaleString("en-IN")}
                    subtitle={`${risk.highRiskAlerts ?? 0} high-risk alerts`}
                    icon={ShieldAlert}
                />
            </div>

            <div className="insight-grid">
                <div className="panel">
                    <div className="panel-heading">
                        <div>
                            <h3>Transaction activity</h3>
                            <p>Transaction volume by type</p>
                        </div>
                        <Activity size={19} />
                    </div>

                    <div className="chart-area">
                        {transactionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={transactionData}>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="var(--color-border)"
                                    />
                                    <XAxis
                                        dataKey="type"
                                        stroke="var(--color-text-secondary)"
                                    />
                                    <YAxis stroke="var(--color-text-secondary)" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "var(--color-surface)",
                                            borderColor: "var(--color-border)",
                                            color: "var(--color-text-primary)",
                                        }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill="var(--color-brand)"
                                        radius={[5, 5, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="empty-chart">Transaction chart data unavailable.</p>
                        )}
                    </div>
                </div>

                <div className="panel">
                    <div className="panel-heading">
                        <div>
                            <h3>Alert severity</h3>
                            <p>Distribution of detected alerts</p>
                        </div>
                        <ShieldAlert size={19} />
                    </div>

                    <div className="chart-area">
                        {severityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={severityData}
                                        dataKey="count"
                                        nameKey="severity"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={4}
                                    >
                                        {severityData.map((entry, index) => (
                                            <Cell
                                                key={entry.severity || index}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="empty-chart">Severity data unavailable.</p>
                        )}
                    </div>

                    <div className="severity-legend">
                        {severityData.map((item, index) => (
                            <span key={item.severity || index}>
                                <i style={{ background: COLORS[index % COLORS.length] }} />
                                {item.severity}: {item.count}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bottom-grid">
                <div className="panel summary-panel">
                    <h3>Risk summary</h3>

                    <div className="summary-row">
                        <span>High-risk alerts</span>
                        <strong>{risk.highRiskAlerts ?? 0}</strong>
                    </div>

                    <div className="summary-row">
                        <span>Average risk score</span>
                        <strong>{risk.averageRiskScore ?? 0}</strong>
                    </div>

                    <div className="summary-row">
                        <span>Total transfers</span>
                        <strong>{totals.transfers ?? 0}</strong>
                    </div>

                    <div className="summary-row">
                        <span>Transaction amount</span>
                        <strong>
                            ₹{Number(transactionMetrics.totalAmount ?? 0).toLocaleString("en-IN")}
                        </strong>
                    </div>
                </div>

                <div className="panel status-panel">
                    <h3>Account status</h3>

                    {[
                        ["ACTIVE", accountMetrics.active],
                        ["DORMANT", accountMetrics.dormant],
                        ["CLOSED", accountMetrics.closed],
                    ].map(
                        ([status, count]) => (
                            <div className="summary-row" key={status}>
                                <span>{status.replaceAll("_", " ")}</span>
                                <strong>{count ?? 0}</strong>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}