import React from "react";
import { X, Trophy, TrendingUp, Target } from "lucide-react";

type WorkoutCompletionPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  weeklyImprovement: number;
  overallImprovement: number;
  newRecords: Array<{
    exerciseName: string;
    reps: number;
    weight: number;
  }>;
};

export default function WorkoutCompletionPopup({
  isOpen,
  onClose,
  weeklyImprovement,
  overallImprovement,
  newRecords,
}: WorkoutCompletionPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1C1F26] border border-[#2F3544] rounded-2xl p-6 max-w-sm w-full relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5E6272] hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-[#00FFAD] to-[#00E599] rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="text-black" size={28} />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Congratulations!
          </h2>
          <p className="text-[#5E6272] text-sm">You completed this workout</p>
        </div>

        {/* Progress Stats */}
        <div className="space-y-4 mb-6">
          {weeklyImprovement > 0 && (
            <div className="flex items-center gap-3 bg-[#0B1426] rounded-lg p-3">
              <TrendingUp className="text-[#00FFAD]" size={20} />
              <div>
                <p className="text-white text-sm font-medium">
                  {weeklyImprovement.toFixed(1)}% stronger than last week
                </p>
              </div>
            </div>
          )}

          {overallImprovement > 0 && (
            <div className="flex items-center gap-3 bg-[#0B1426] rounded-lg p-3">
              <Target className="text-[#FBA3FF]" size={20} />
              <div>
                <p className="text-white text-sm font-medium">
                  {overallImprovement.toFixed(1)}% stronger since starting
                </p>
              </div>
            </div>
          )}

          {/* New Records */}
          {newRecords.length > 0 && (
            <div className="bg-[#0B1426] rounded-lg p-3">
              <p className="text-[#00FFAD] text-sm font-medium mb-2">
                New Personal Records!
              </p>
              {newRecords.map((record, index) => (
                <div key={index} className="text-white text-sm">
                  <span className="text-[#5E6272]">•</span> {record.reps} rep
                  max on {record.exerciseName} ({record.weight}kg)
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Continue Button */}
        <button
          onClick={onClose}
          className="w-full bg-[#00FFAD] hover:bg-[#00E599] text-black font-medium py-3 rounded-lg transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
