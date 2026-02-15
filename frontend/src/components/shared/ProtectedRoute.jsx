import { Navigate } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore";

export default function ProtectedRoute({ children, role }) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/" />;

  if (role && user.role !== role) return <Navigate to="/" />;

  return children;
}
