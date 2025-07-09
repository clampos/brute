import React, { useState, useEffect } from "react";
import { ArrowRight, Plus, Edit3, Trash2, Play, ChevronLeft, Save } from "lucide-react";

// Mock data for demonstration
const mockProgrammes = [
  {
    id: "1",
    name: "Superman Inspired",
    description: "Build strength like the Man of Steel with this comprehensive full-body programme",
    weeks: 8,
    daysPerWeek: 3,
    bodyPartFocus: "Full Body",
    exercises: [
      {
        id: "1",
        exerciseId: "bench-press",
        dayNumber: 1,
        orderIndex: 1,
        targetSets: 3,
        targetReps: "8-12",
        restSeconds: 120,
        exercise: {
          id: "bench-press",
          name: "Bench Press",
          muscleGroup: "Chest",
          type: "compound"
        }
      },
      {
        id: "2",
        exerciseId: "squat",
        dayNumber: 1,
        orderIndex: 2,
        targetSets: 3,
        targetReps: "8-12",
        restSeconds: 180,
        exercise: {
          id: "squat",
          name: "Squat",
          muscleGroup: "Legs",
          type: "compound"
        }
      }
    ]
  },
  {
    id: "2",
    name: "Upper Body Domination",
    description: "Focus on building impressive upper body strength and size",
    weeks: 6,
    daysPerWeek: 4,
    bodyPartFocus: "Upper Body",
    exercises: []
  },
  {
    id: "3",
    name: "Leg Day Destroyer",
    description: "Don't skip leg day - build powerful lower body strength",
    weeks: 4,
    daysPerWeek: 2,
    bodyPartFocus: "Lower Body",
    exercises: []
  }
];

// Types
interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  type: string;
  instructions?: string;
}

interface ProgrammeExercise {
  id: string;
  exerciseId: string;
  dayNumber: number;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  exercise: Exercise;
}

interface Programme {
  id: string;
  name: string;
  description?: string;
  weeks: number;
  daysPerWeek: number;
  bodyPartFocus: string;
  exercises: ProgrammeExercise[];
}

interface UserProgram {
  id: string;
  programmeId: string;
  currentWeek: number;
  currentDay: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  programme: Programme;
}

export default function ProgrammesScreen() {
  const [activeTab, setActiveTab] = useState("browse");
  const [programmes, setProgrammes] = useState<Programme[]>(mockProgrammes);
  const [userProgram, setUserProgram] = useState<UserProgram | null>(null);
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);

  const navItems = ["browse", "active", "history"];

  const handleStartProgramme = (programmeId: string) => {
    const programme = programmes.find(p => p.id === programmeId);
    if (programme) {
      const newUserProgram: UserProgram = {
        id: "user-program-1",
        programmeId: programmeId,
        currentWeek: 1,
        currentDay: 1,
        status: 'ACTIVE',
        programme: programme
      };
      setUserProgram(newUserProgram);
      setActiveTab("active");
      setSelectedProgramme(null);
    }
  };

  const getBodyPartFocusColor = (focus: string) => {
    const colors = {
      "Full Body": "from-[#FFB8E0] to-[#BE9EFF]",
      "Upper Body": "from-[#BE9EFF] to-[#88C0FC]",
      "Lower Body": "from-[#88C0FC] to-[#86FF99]",
      "Legs": "from-[#86FF99] to-[#FFB8E0]",
      "Arms": "from-[#FFB8E0] to-[#88C0FC]",
      "Shoulders": "from-[#BE9EFF] to-[#86FF99]",
      "Chest": "from-[#88C0FC] to-[#FFB8E0]",
      "Back": "from-[#86FF99] to-[#BE9EFF]",
    };
    return colors[focus as keyof typeof colors] || "from-[#FFB8E0] to-[#BE9EFF]";
  };

  const groupExercisesByDay = (exercises: ProgrammeExercise[], daysPerWeek: number) => {
    const grouped: { [key: number]: ProgrammeExercise[] } = {};
    for (let i = 1; i <= daysPerWeek; i++) {
      grouped[i] = exercises.filter(ex => ex.dayNumber === i);
    }
    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-sans bg-gradient-to-b from-[#001F3F] to-[#000B1A]">
        Loading programmes...
      </div>
    );
  }

  // Programme Detail View
  if (selectedProgramme) {
    const exercisesByDay = groupExercisesByDay(selectedProgramme.exercises, selectedProgramme.daysPerWeek);
    
    return (
      <div className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-16" style={{ background: "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)" }}>
        {/* Logo */}
        <div className="w-full max-w-[375px] h-[44px] px-4 flex justify-center items-center mx-auto">
          <div className="w-[84.56px] h-[15px] bg-white/20 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">BRUTE</span>
          </div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mt-4 px-2">
          <button 
            onClick={() => setSelectedProgramme(null)}
            className="flex items-center text-white font-semibold"
          >
            <ChevronLeft size={20} className="mr-2" />
            Back
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#246BFD] to-[#BE9EFF]"></div>
        </div>

        {/* Programme Header */}
        <div className="mt-6">
          <div className={`rounded-2xl p-6 bg-gradient-to-br ${getBodyPartFocusColor(selectedProgramme.bodyPartFocus)} text-black mb-6`}>
            <h1 className="text-2xl font-bold mb-2">{selectedProgramme.name}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-black/20 px-3 py-1 rounded-full text-sm font-medium">{selectedProgramme.weeks} weeks</span>
              <span className="bg-black/20 px-3 py-1 rounded-full text-sm font-medium">{selectedProgramme.daysPerWeek} days/week</span>
              <span className="bg-black/20 px-3 py-1 rounded-full text-sm font-medium">{selectedProgramme.bodyPartFocus}</span>
            </div>
            {selectedProgramme.description && (
              <p className="text-sm opacity-80 mb-4">{selectedProgramme.description}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => handleStartProgramme(selectedProgramme.id)}
                className="bg-[#246BFD] text-white px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg hover:bg-[#1e56d4] transition-colors"
              >
                <Play size={16} />
                Start Programme
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-white/20 text-black px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/30 transition-colors"
              >
                <Edit3 size={16} />
                {isEditing ? "Done" : "Customize"}
              </button>
            </div>
          </div>

          {/* Exercise Days */}
          <div className="space-y-4">
            {Array.from({ length: selectedProgramme.daysPerWeek }, (_, i) => i + 1).map((day) => {
              const exercises = exercisesByDay[day] || [];
              return (
                <div key={day} className="rounded-xl p-4 bg-[#262A34]">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-white font-semibold text-lg">Day {day}</h3>
                    {isEditing && (
                      <button
                        onClick={() => setEditingDay(editingDay === day ? null : day)}
                        className="text-[#246BFD] text-sm font-medium hover:text-[#1e56d4] transition-colors"
                      >
                        {editingDay === day ? "Done" : "Edit"}
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {exercises.length > 0 ? exercises.map((programmeExercise) => (
                      <div key={programmeExercise.id} className="flex justify-between items-center p-3 bg-[#1A1D23] rounded-lg">
                        <div>
                          <p className="text-white font-medium">{programmeExercise.exercise.name}</p>
                          <p className="text-[#5E6272] text-sm">
                            {programmeExercise.targetSets} sets × {programmeExercise.targetReps} reps
                          </p>
                        </div>
                        {isEditing && editingDay === day && (
                          <div className="flex gap-2">
                            <button className="text-[#246BFD] p-1 hover:bg-[#246BFD]/20 rounded transition-colors">
                              <Edit3 size={16} />
                            </button>
                            <button className="text-red-500 p-1 hover:bg-red-500/20 rounded transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )) : (
                      <div className="p-4 text-center text-[#5E6272]">
                        <p className="text-sm">No exercises added yet</p>
                      </div>
                    )}
                    
                    {isEditing && editingDay === day && (
                      <button className="w-full p-3 bg-[#1A1D23] rounded-lg border-2 border-dashed border-[#5E6272] text-[#5E6272] flex items-center justify-center gap-2 hover:border-[#246BFD] hover:text-[#246BFD] transition-colors">
                        <Plus size={16} />
                        Add Exercise
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Main Programme List View
  return (
    <div className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-16" style={{ background: "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)" }}>
      {/* Logo */}
      <div className="w-full max-w-[375px] h-[44px] px-4 flex justify-center items-center mx-auto">
        <div className="w-[84.56px] h-[15px] bg-white/20 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">BRUTE</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mt-4 px-2">
        <h2 className="text-white font-semibold text-xl">Programmes</h2>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#246BFD] to-[#BE9EFF]"></div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex justify-around mt-6 mb-4