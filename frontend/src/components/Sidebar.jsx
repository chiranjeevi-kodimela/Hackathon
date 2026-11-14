import {
    LayoutDashboard,
    Users,
    Wallet,
    ArrowLeftRight,
    ShieldAlert,
    BriefcaseBusiness,
    Settings,
    ShieldCheck,
} from "lucide-react";

const navigation = [
    { label: "Overview", path: "/", icon: LayoutDashboard },
    { label: "Customers", path: "/customers", icon: Users },
    { label: "Accounts", path: "/accounts", icon: Wallet },
    { label: "Transactions", path: "/transactions", icon: ArrowLeftRight },
    { label: "Alerts", path: "/alerts", icon: ShieldAlert },
    { label: "Cases", path: "/cases", icon: BriefcaseBusiness },
];

export default function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="brand">
                <div className="brand-icon"><ShieldCheck size={22} /></div>
                <div>
                    <h2>RiskLens</h2>
                    <span>RISK INTELLIGENCE</span>
                </div>
            </div>

            <div className="nav-label">WORKSPACE</div>

            <nav>
                {navigation.map(({ label, path, icon: Icon }, index) => (
                    <a
                        key={path}
                        href={path}
                        className={`nav-item ${index === 0 ? "active" : ""}`}
                    >
                        <Icon size={18} />
                        <span>{label}</span>
                    </a>
                ))}
            </nav>

            <div className="sidebar-bottom">
                <div className="nav-label">SYSTEM</div>
                <a href="/settings" className="nav-item">
                    <Settings size={18} />
                    <span>Settings</span>
                </a>

                <div className="analyst-profile">
                    <div className="avatar">A</div>
                    <div>
                        <strong>Risk Analyst</strong>
                        <span>Operations team</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}