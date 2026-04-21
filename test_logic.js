const exercise = {
  workoutSets: [
    { weight: '', reps: '', completed: false },
    { weight: '', reps: '', completed: false },
    { weight: '', reps: '', completed: false }
  ]
};

for (let setIdx = 0; setIdx < exercise.workoutSets.length; setIdx++) {
  const disabled = setIdx > 0 && !exercise.workoutSets[setIdx - 1]?.completed;
  console.log(`Set ${setIdx + 1}: disabled = ${disabled}`);
}
