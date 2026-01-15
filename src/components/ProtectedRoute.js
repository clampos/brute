import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate } from "react-router-dom";
export function ProtectedRoute({ children }) {
    const token = localStorage.getItem("token");
    if (!token) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return children;
}
