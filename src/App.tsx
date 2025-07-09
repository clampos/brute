import { BrowserRouter, Routes, Route } from "react-router-dom";
import Onboarding from "./screens/Onboarding";
import Login from "./screens/Login";
import Signup from "./screens/Signup";
import Dashboard from "./screens/Dashboard";
import SubscriptionSuccess from "./screens/SubscriptionSuccess";
import Settings from "./screens/Settings";
import ResetPassword from "./components/ResetPassword";
import ProgrammesScreen from "./screens/Programmes";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/subscription-success" element={<SubscriptionSuccess />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/programmes" element={<ProgrammesScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
