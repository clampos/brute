const sets = [
  { weight: '', reps: '', completed: false },
  { weight: '50', reps: '', completed: false },
  { weight: '', reps: '10', completed: false },
  { weight: '50', reps: '10', completed: false },
  { weight: '50', reps: '10', completed: true }
];

sets.forEach((set, idx) => {
  const canComplete = set.weight.trim() && set.reps.trim();
  const newCompleted = canComplete ? !set.completed : false;
  console.log(`Set ${idx + 1}: weight="${set.weight}", reps="${set.reps}", canComplete=${canComplete}, completed=${newCompleted}`);
});
