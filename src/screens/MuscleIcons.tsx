import React, { useEffect, useState } from "react";
import MuscleIcon from "../components/MuscleIcon";

export default function MuscleIcons() {
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch("http://localhost:4242/auth/exercises/all", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!res.ok) throw new Error("Failed to fetch exercises");
        const exercises = await res.json();
        const unique = Array.from(
          new Set((exercises || []).map((e: any) => e.muscleGroup || ""))
        ).filter(Boolean);
        unique.sort();
        setGroups(unique);
      } catch (err) {
        console.error("Error fetching muscle groups:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  if (loading) return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="min-h-screen p-6 bg-[#0B1020] text-white">
      <h2 className="text-xl font-semibold mb-4">Muscle Group Icons</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {groups.map((g) => (
          <div
            key={g}
            className="flex items-center gap-3 bg-[#161922] p-3 rounded"
          >
            <MuscleIcon muscleGroup={g} size={40} />
            <div>
              <div className="font-semibold">{g}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
