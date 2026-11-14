import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import "./styles/global.css";

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <header className="topbar">
          <span>Risk Intelligence Platform</span>
          <div className="system-status">
            <span className="status-dot" />
            System Online
          </div>
        </header>

        <Dashboard />
      </main>
    </div>
  );
}