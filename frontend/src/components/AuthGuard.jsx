import { Navigate, useLocation } from "react-router-dom";

const AuthGuard = ({ children }) => {
  const token = localStorage.getItem("registry_token");
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

export default AuthGuard;
