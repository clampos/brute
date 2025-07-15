// brute/server/prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedExercises() {
  const existingCount = await prisma.exercise.count();
  if (existingCount > 0) {
    console.log('Exercises already seeded.');
    return;
  }

  const exercises = [
    { name: 'Barbell Back Squat', muscleGroup: 'Legs', category: 'Compound', equipment: 'Barbell' },
    { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', category: 'Compound', equipment: 'Barbell' },
    { name: 'Hip Thrust', muscleGroup: 'Glutes', category: 'Isolation', equipment: 'Barbell' },
    { name: 'Push-up', muscleGroup: 'Chest', category: 'Compound', equipment: 'Bodyweight' },
    { name: 'Pull-up', muscleGroup: 'Back', category: 'Compound', equipment: 'Bodyweight' },
    { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', category: 'Compound', equipment: 'Dumbbell' },
    { name: 'Dumbbell Lateral Raise', muscleGroup: 'Shoulders', category: 'Isolation', equipment: 'Dumbbell' },
    { name: 'Bench Press', muscleGroup: 'Chest', category: 'Compound', equipment: 'Barbell' },
    { name: 'Bent Over Row', muscleGroup: 'Back', category: 'Compound', equipment: 'Barbell' },
    { name: 'Lunge', muscleGroup: 'Legs', category: 'Compound', equipment: 'Bodyweight' },
  ];

  await prisma.exercise.createMany({ data: exercises });
  console.log('✅ Seeded exercises');
}

async function seedProgrammes() {
  const exercises = await prisma.exercise.findMany();
  const byName = (name: string) => exercises.find(e => e.name === name);

  const programmes = [
    {
      name: 'Full Body Blast',
      daysPerWeek: 3,
      weeks: 4,
      bodyPartFocus: 'Full Body',
      description: 'A balanced programme hitting all major muscle groups.',
      exercises: [
        { day: 1, name: 'Barbell Back Squat', sets: 3, reps: '8-10' },
        { day: 1, name: 'Push-up', sets: 3, reps: 'AMRAP' },
        { day: 1, name: 'Pull-up', sets: 3, reps: 'AMRAP' },
        { day: 2, name: 'Romanian Deadlift', sets: 3, reps: '10' },
        { day: 2, name: 'Dumbbell Shoulder Press', sets: 3, reps: '10-12' },
        { day: 3, name: 'Lunge', sets: 3, reps: '12' },
        { day: 3, name: 'Bench Press', sets: 3, reps: '8-10' },
      ],
    },
    {
      name: 'Upper Body Strength',
      daysPerWeek: 4,
      weeks: 4,
      bodyPartFocus: 'Upper Body',
      description: 'Focused strength training for chest, back, shoulders and arms.',
      exercises: [
        { day: 1, name: 'Bench Press', sets: 4, reps: '6-8' },
        { day: 1, name: 'Pull-up', sets: 4, reps: 'AMRAP' },
        { day: 2, name: 'Dumbbell Shoulder Press', sets: 4, reps: '8' },
        { day: 2, name: 'Bent Over Row', sets: 4, reps: '10' },
        { day: 3, name: 'Push-up', sets: 3, reps: 'AMRAP' },
        { day: 4, name: 'Dumbbell Lateral Raise', sets: 3, reps: '12' },
      ],
    },
    {
      name: 'Glute Growth',
      daysPerWeek: 3,
      weeks: 6,
      bodyPartFocus: 'Lower Body',
      description: 'Targeted programme for glute strength and hypertrophy.',
      exercises: [
        { day: 1, name: 'Hip Thrust', sets: 4, reps: '8-10' },
        { day: 1, name: 'Romanian Deadlift', sets: 3, reps: '10-12' },
        { day: 2, name: 'Barbell Back Squat', sets: 4, reps: '8' },
        { day: 3, name: 'Lunge', sets: 3, reps: '12' },
        { day: 3, name: 'Hip Thrust', sets: 3, reps: 'AMRAP' },
      ],
    }
  ];

  for (const p of programmes) {
    const programme = await prisma.programme.create({
      data: {
        name: p.name,
        daysPerWeek: p.daysPerWeek,
        weeks: p.weeks,
        bodyPartFocus: p.bodyPartFocus,
        description: p.description,
      },
    });

    await Promise.all(p.exercises.map((e, i) => {
      const ex = byName(e.name);
      if (!ex) return;

      return prisma.programmeExercise.create({
        data: {
          programmeId: programme.id,
          exerciseId: ex.id,
          dayNumber: e.day,
          orderIndex: i + 1,
          sets: e.sets,
          reps: e.reps,
        },
      });
    }));
  }

  console.log('✅ Seeded programmes and their exercises');
}

async function main() {
  await seedExercises();
  await seedProgrammes();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
