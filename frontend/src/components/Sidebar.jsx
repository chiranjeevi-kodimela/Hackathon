import {
    LayoutDashboard,
    Users,
    Wallet,
    ArrowLeftRight,
    ShieldAlert,
    BriefcaseBusiness,
    ScrollText,
    ShieldCheck,
    SlidersHorizontal,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navigation = [
    { label: "Overview", path: "/", icon: LayoutDashboard },
    { label: "Customers", path: "/customers", icon: Users },
    { label: "Accounts", path: "/accounts", icon: Wallet },
    { label: "Transactions", path: "/transactions", icon: ArrowLeftRight },
    { label: "Alerts", path: "/alerts", icon: ShieldAlert },
    { label: "Cases", path: "/cases", icon: BriefcaseBusiness },
    { label: "Risk Rules", path: "/rules", icon: SlidersHorizontal },
    { label: "Audit Log", path: "/audit", icon: ScrollText },
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
                {navigation.map(({ label, path, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={path}
                        end={path === "/"}
                        className={({ isActive }) =>
                            `nav-item${isActive ? " active" : ""}`
                        }
                    >
                        <Icon size={18} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-bottom">
                <div className="nav-label">ANALYST</div>
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