import React from "react";
import { X, Trophy, TrendingUp, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { modalOverlay, modalPanel, stagger, fadeUp, spring } from "../utils/animations";

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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50"
          variants={modalOverlay}
          initial="hidden"
          animate="show"
          exit="hidden"
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="bg-[#1C1F26] border border-[#2F3544] rounded-2xl p-6 max-w-sm w-full relative"
            variants={modalPanel}
            transition={spring}
          >
            {/* Close Button */}
            <motion.button
              onClick={onClose}
              whileTap={{ scale: 0.9 }}
              className="absolute top-4 right-4 text-[#5E6272] hover:text-white transition-colors"
            >
              <X size={20} />
            </motion.button>

            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                className="w-16 h-16 bg-gradient-to-r from-[#00FFAD] to-[#00E599] rounded-full flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 18 }}
              >
                <Trophy className="text-black" size={28} />
              </motion.div>
              <motion.h2
                className="text-xl font-semibold text-white mb-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              >
                Congratulations!
              </motion.h2>
              <motion.p
                className="text-[#5E6272] text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32, duration: 0.3 }}
              >
                You completed this workout
              </motion.p>
            </div>

            {/* Progress Stats */}
            <motion.div
              className="space-y-4 mb-6"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              {weeklyImprovement > 0 && (
                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.22 }}
                  className="flex items-center gap-3 bg-[#0B1426] rounded-lg p-3"
                >
                  <TrendingUp className="text-[#00FFAD]" size={20} />
                  <div>
                    <p className="text-white text-sm font-medium">
                      {weeklyImprovement.toFixed(1)}% stronger than last week
                    </p>
                  </div>
                </motion.div>
              )}

              {overallImprovement > 0 && (
                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.22 }}
                  className="flex items-center gap-3 bg-[#0B1426] rounded-lg p-3"
                >
                  <Target className="text-[#FBA3FF]" size={20} />
                  <div>
                    <p className="text-white text-sm font-medium">
                      {overallImprovement.toFixed(1)}% stronger since starting
                    </p>
                  </div>
                </motion.div>
              )}

              {newRecords.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.22 }}
                  className="bg-[#0B1426] rounded-lg p-3"
                >
                  <p className="text-[#00FFAD] text-sm font-medium mb-2">
                    New Personal Records!
                  </p>
                  {newRecords.map((record, index) => (
                    <div key={index} className="text-white text-sm">
                      <span className="text-[#5E6272]">•</span> {record.reps} rep
                      max on {record.exerciseName} ({record.weight}kg)
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* Continue Button */}
            <motion.button
              onClick={onClose}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-[#00FFAD] hover:bg-[#00E599] text-black font-medium py-3 rounded-lg transition-colors"
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
