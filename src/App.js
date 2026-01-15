import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Onboarding from "./screens/Onboarding";
import Login from "./screens/Login";
import Signup from "./screens/Signup";
import Dashboard from "./screens/Dashboard";
import SubscriptionSuccess from "./screens/SubscriptionSuccess";
import Settings from "./screens/Settings";
import ResetPassword from "./components/ResetPassword";
import ProgrammesScreen from "./screens/Programmes";
import ProgrammeEditor from "./screens/ProgrammeEditor";
import Workouts from "./screens/Workouts";
import Metrics from "./screens/Metrics";
import MuscleIcons from "./screens/MuscleIcons";
import ExercisePRs from "./screens/ExercisePRs";
import CreateProgramme from "./screens/CreateProgramme";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MenuProvider } from "./contexts/MenuContext";
export default function App() {
    return (_jsx(MenuProvider, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Onboarding, {}) }), _jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/signup", element: _jsx(Signup, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(ProtectedRoute, { children: _jsx(Dashboard, {}) }) }), _jsx(Route, { path: "/subscription-success", element: _jsx(ProtectedRoute, { children: _jsx(SubscriptionSuccess, {}) }) }), _jsx(Route, { path: "/settings", element: _jsx(ProtectedRoute, { children: _jsx(Settings, {}) }) }), _jsx(Route, { path: "/reset-password", element: _jsx(ResetPassword, {}) }), _jsx(Route, { path: "/programmes", element: _jsx(ProtectedRoute, { children: _jsx(ProgrammesScreen, {}) }) }), _jsx(Route, { path: "/programmes/create", element: _jsx(ProtectedRoute, { children: _jsx(CreateProgramme, {}) }) }), _jsx(Route, { path: "/workouts", element: _jsx(ProtectedRoute, { children: _jsx(Workouts, {}) }) }), _jsx(Route, { path: "/editor/:programmeId", element: _jsx(ProtectedRoute, { children: _jsx(ProgrammeEditor, {}) }) }), _jsx(Route, { path: "/metrics", element: _jsx(ProtectedRoute, { children: _jsx(Metrics, {}) }) }), _jsx(Route, { path: "/debug/muscle-icons", element: _jsx(ProtectedRoute, { children: _jsx(MuscleIcons, {}) }) }), _jsx(Route, { path: "/metrics/pr/:exerciseId", element: _jsx(ProtectedRoute, { children: _jsx(ExercisePRs, {}) }) })] }) }) }));
}
