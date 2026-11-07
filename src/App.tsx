import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./context/AppContext";
import { ROLE_ROUTES } from "./lib/permissions";
import CitizenPortal from "./pages/CitizenPortal";
import Departments from "./pages/Departments";
import DepartmentDetail from "./pages/DepartmentDetail";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Tenders from "./pages/Tenders";
import TenderDetail from "./pages/TenderDetail";
import Payments from "./pages/Payments";
import Documents from "./pages/Documents";
import Verify from "./pages/Verify";
import Audits from "./pages/Audits";
import MapPage from "./pages/MapPage";
import MoneyFlow from "./pages/MoneyFlow";
import Complaints from "./pages/Complaints";
import Login from "./pages/Login";
import AdminDashboard from "./pages/roles/AdminDashboard";
import FinanceDashboard from "./pages/roles/FinanceDashboard";
import ProcurementDashboard from "./pages/roles/ProcurementDashboard";
import ContractorDashboard from "./pages/roles/ContractorDashboard";
import AuditorDashboard from "./pages/roles/AuditorDashboard";
import CitizenDashboard from "./pages/roles/CitizenDashboard";
import NotFound from "./pages/NotFound";

function AppHome() { const { role } = useApp(); return <Navigate to={ROLE_ROUTES[role]} replace />; }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CitizenPortal />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/departments/:id" element={<DepartmentDetail />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/tenders" element={<Tenders />} />
        <Route path="/tenders/:id" element={<TenderDetail />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/audits" element={<Audits />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/money-flow" element={<MoneyFlow />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<AppHome />} />
        <Route path="/app/admin" element={<AdminDashboard />} />
        <Route path="/app/finance" element={<FinanceDashboard />} />
        <Route path="/app/procurement" element={<ProcurementDashboard />} />
        <Route path="/app/contractor" element={<ContractorDashboard />} />
        <Route path="/app/auditor" element={<AuditorDashboard />} />
        <Route path="/app/citizen" element={<CitizenDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
