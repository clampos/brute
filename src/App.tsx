import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";

// Auth / onboarding screens — loaded eagerly (always on the critical path)
import Onboarding from "./screens/Onboarding.tsx";
import Login from "./screens/Login.tsx";
import Signup from "./screens/Signup.tsx";
import ResetPassword from "./components/ResetPassword.tsx";

// Main app screens — code-split so the browser only parses each bundle when
// the user first navigates to that route
const Dashboard          = lazy(() => import("./screens/Dashboard.tsx"));
const Settings           = lazy(() => import("./screens/Settings.tsx"));
const SubscriptionSuccess = lazy(() => import("./screens/SubscriptionSuccess.tsx"));
const ProgrammesScreen   = lazy(() => import("./screens/Programmes.tsx"));
const ProgrammeEditor    = lazy(() => import("./screens/ProgrammeEditor.tsx"));
const CreateProgramme    = lazy(() => import("./screens/CreateProgramme.tsx"));
const Workouts           = lazy(() => import("./screens/Workouts.tsx"));
const Metrics            = lazy(() => import("./screens/Metrics.tsx"));
const ExercisePRs        = lazy(() => import("./screens/ExercisePRs.tsx"));
const MuscleIcons        = lazy(() => import("./screens/MuscleIcons.tsx"));

// Minimal fallback — invisible so it doesn't flash a loading state
const Fallback = () => <div className="min-h-screen bg-[#0B0F1A]" />;

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/subscription-success" element={<ProtectedRoute><SubscriptionSuccess /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/programmes" element={<ProtectedRoute><ProgrammesScreen /></ProtectedRoute>} />
          <Route path="/programmes/create" element={<ProtectedRoute><CreateProgramme /></ProtectedRoute>} />
          <Route path="/editor/:programmeId" element={<ProtectedRoute><ProgrammeEditor /></ProtectedRoute>} />
          <Route path="/workouts" element={<ProtectedRoute><Workouts /></ProtectedRoute>} />
          <Route path="/metrics" element={<ProtectedRoute><Metrics /></ProtectedRoute>} />
          <Route path="/metrics/pr/:exerciseId" element={<ProtectedRoute><ExercisePRs /></ProtectedRoute>} />
          <Route path="/debug/muscle-icons" element={<ProtectedRoute><MuscleIcons /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
