import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // console.log("Protected route check:", { isAuthenticated, isLoading });

  // Nothing rendered while the session resolves. This is a fast local check
  // (a token read plus an expiry comparison), and it runs on every protected
  // navigation - showing a full-screen loader for it meant the app appeared to
  // restart each time. Returning null keeps the surrounding layout in place for
  // the moment it takes.
  if (isLoading) return null;

  if (!isAuthenticated) {
    // console.log("User not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
