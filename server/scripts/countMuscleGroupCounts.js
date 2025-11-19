const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const groups = await prisma.exercise.groupBy({
      by: ["muscleGroup"],
      _count: { muscleGroup: true },
      orderBy: { muscleGroup: "asc" },
    });

    console.log("muscleGroup counts:");
    groups.forEach((g) =>
      console.log(`${g.muscleGroup}: ${g._count.muscleGroup}`)
    );
  } catch (err) {
    console.error("Error querying DB:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
