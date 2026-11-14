
import { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw } from "lucide-react";
import api from "../services/api";

export default function RiskRules() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function fetchRules() {
        try {
            setError("");
            const response = await api.get("/rules");
            const payload = response.data?.data;
            setRules(Array.isArray(payload) ? payload : payload?.rules || []);
        } catch {
            setError("Unable to load risk rules.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let active = true;

        async function loadRules() {
            try {
                const response = await api.get("/rules");
                const payload = response.data?.data;
                const data = Array.isArray(payload) ? payload : payload?.rules || [];

                if (active) {
                    setRules(data);
                    setError("");
                }
            } catch {
                if (active) {
                    setError("Unable to load risk rules.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadRules();

        return () => {
            active = false;
        };
    }, []);

    return (
        <section className="page-container">
            <div className="page-header">
                <div>
                    <span className="topbar-label">RISK CONFIGURATION</span>
                    <h1>Risk Rules</h1>
                    <p>Transparent rules used to evaluate transaction risk.</p>
                </div>
                <button className="refresh-button" onClick={fetchRules}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {loading && <p>Loading risk rules...</p>}
            {error && <p className="error-message">{error}</p>}

            {!loading && !error && (
                <div className="rules-grid">
                    {rules.map((rule) => (
                        <article className="rule-card" key={rule.ruleId || rule.id}>
                            <div className="rule-card-header">
                                <span className="rule-id">{rule.ruleId || rule.id}</span>
                                <ShieldCheck size={20} />
                            </div>
                            <h3>{rule.name}</h3>
                            <p>{rule.description}</p>
                            <div className="rule-card-footer">
                                <strong>{rule.points} points</strong>
                                <span className={rule.enabled ? "status-active" : "status-inactive"}>
                                    {rule.enabled ? "Active" : "Inactive"}
                                </span>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {!loading && !error && rules.length === 0 && (
                <p>No risk rules found.</p>
            )}
        </section>
    );
}
