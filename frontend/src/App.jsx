
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import "./styles/global.css";
import Accounts from "./pages/Accounts";
import Transactions from "./pages/Transactions";
import Alerts from "./pages/Alerts";
import Cases from "./pages/Cases";
import AuditLog from "./pages/AuditLog";
import RiskRules from "./pages/RiskRules";

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="topbar-label">RISK INTELLIGENCE PLATFORM</span>
          </div>
          <div className="system-status">
            <span className="status-dot"></span>
            System Online
          </div>
        </header>

        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="*" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/rules" element={<RiskRules />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
