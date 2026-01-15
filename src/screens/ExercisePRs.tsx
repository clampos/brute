import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MuscleIcon from "../components/MuscleIcon";
import TopBar from "../components/TopBar";
import { Award } from "lucide-react";
import logo from "../assets/logo.png";
import BottomBar from "../components/BottomBar";

interface PREntry {
  weight: number;
  date: string;
}

export default function ExercisePRs() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchPRs = async () => {
      try {
        const res = await fetch(
          "http://localhost:4242/auth/metrics/personal-records",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch PRs");
        const data = await res.json();
        const found = data.find((d: any) => d.exerciseId === exerciseId);
        setRecord(found || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPRs();
  }, [exerciseId, navigate]);

  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (!record)
    return (
      <div className="p-6 text-white">
        <p>No PRs found for this exercise.</p>
        <Link to="/metrics" className="text-[#00FFAD] underline">
          Back to Metrics
        </Link>
      </div>
    );

  // Build ordered PR list for display
  const repsOrder = [1, 2, 3, 5, 10];
  const prs = repsOrder
    .map((r) => ({
      reps: r,
      entry: record.prs?.[r] || record.prs?.[String(r)] || null,
    }))
    .filter((p) => p.entry !== null && p.entry !== undefined);

  return (
    <div
      className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-16"
      style={{
        backgroundColor: "#0A0E1A",
      }}
    >
      <TopBar
        title="Track Metrics"
        pageIcon={<Award size={18} />}
        menuItems={[
          { label: "Track Metrics", onClick: () => navigate("/metrics") },
          { label: "Dashboard", onClick: () => navigate("/") },
          { label: "Programmes", onClick: () => navigate("/programmes") },
          { label: "Workouts", onClick: () => navigate("/workouts") },
          { label: "Settings", onClick: () => navigate("/settings") },
        ]}
      />

      <div className="mt-6 px-2">
        <div className="bg-[#262A34] rounded-xl p-4 mb-4 border-l-4 border-[#00FFAD]">
          <div className="flex items-center gap-4">
            <MuscleIcon muscleGroup={record.muscleGroup} size={48} />
            <div>
              <h3 className="text-white font-semibold text-lg">
                {record.exerciseName}
              </h3>
              <div className="text-[#5E6272] text-sm">{record.muscleGroup}</div>
            </div>
          </div>
        </div>

        {prs.length === 0 ? (
          <div className="bg-[#262A34] p-6 rounded">No recorded PRs yet.</div>
        ) : (
          <div className="space-y-3">
            {prs.map((p) => (
              <div
                key={p.reps}
                className="bg-[#262A34] p-4 rounded flex justify-between items-center"
              >
                <div>
                  <div className="text-sm text-[#9CA3AF]">{p.reps}RM</div>
                  <div className="text-white font-semibold">
                    {p.entry.weight} kg
                  </div>
                </div>
                <div className="text-[#6B7280]">
                  {new Date(p.entry.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomBar
        onLogout={() => {
          localStorage.removeItem("token");
          navigate("/login");
        }}
      />
    </div>
  );
}
