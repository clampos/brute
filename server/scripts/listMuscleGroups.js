const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const groups = await prisma.exercise.findMany({
      select: { muscleGroup: true },
      distinct: ["muscleGroup"],
      orderBy: { muscleGroup: "asc" },
    });

    console.log("Distinct muscleGroup values (count:", groups.length + ")");
    groups.forEach((g) => console.log("-", g.muscleGroup));
  } catch (err) {
    console.error("Error querying DB:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
