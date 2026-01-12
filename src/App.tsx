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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription-success"
          element={
            <ProtectedRoute>
              <SubscriptionSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/programmes"
          element={
            <ProtectedRoute>
              <ProgrammesScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/programmes/create"
          element={
            <ProtectedRoute>
              <CreateProgramme />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workouts"
          element={
            <ProtectedRoute>
              <Workouts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/:programmeId"
          element={
            <ProtectedRoute>
              <ProgrammeEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/metrics"
          element={
            <ProtectedRoute>
              <Metrics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/debug/muscle-icons"
          element={
            <ProtectedRoute>
              <MuscleIcons />
            </ProtectedRoute>
          }
        />
        <Route
          path="/metrics/pr/:exerciseId"
          element={
            <ProtectedRoute>
              <ExercisePRs />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
