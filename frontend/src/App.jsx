
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Customers = lazy(() => import("./pages/Customers"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Cases = lazy(() => import("./pages/Cases"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const RiskRules = lazy(() => import("./pages/RiskRules"));

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
          <Suspense fallback={<div role="status">Loading page...</div>}>
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
          </Suspense>
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
