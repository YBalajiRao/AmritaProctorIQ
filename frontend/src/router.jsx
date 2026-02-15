import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CandidateExam from "./pages/CandidateExam";
import AdminDashboard from "./pages/AdminDashboard";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import ProtectedRoute from "./components/shared/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/exam",
    element: (
      <ProtectedRoute role="candidate">
        <CandidateExam />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute role="admin">
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/reports",
    element: (
      <ProtectedRoute role="admin">
        <ReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute role="admin">
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
]);
