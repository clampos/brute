import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Onboarding from "./screens/Onboarding.tsx";
import Login from "./screens/Login.tsx";
import Signup from "./screens/Signup.tsx";
import Dashboard from "./screens/Dashboard.tsx";
import SubscriptionSuccess from "./screens/SubscriptionSuccess.tsx";
import Settings from "./screens/Settings.tsx";
import ResetPassword from "./components/ResetPassword.tsx";
import ProgrammesScreen from "./screens/Programmes.tsx";
import ProgrammeEditor from "./screens/ProgrammeEditor.tsx";
import Workouts from "./screens/Workouts.tsx";
import Metrics from "./screens/Metrics.tsx";
import MuscleIcons from "./screens/MuscleIcons.tsx";
import ExercisePRs from "./screens/ExercisePRs.tsx";
import CreateProgramme from "./screens/CreateProgramme.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
