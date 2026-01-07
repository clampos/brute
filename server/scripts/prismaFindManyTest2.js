const { PrismaClient } = require("@prisma/client");

async function test() {
  const prisma = new PrismaClient();
  try {
    const groups = ["Lats", "Middle Back", "Shoulders", "Biceps"];
    for (const g of groups) {
      console.log("\n=== Testing group:", g, "===");
      const whereClause = {
        muscleGroup: {
          equals: g,
        },
      };

      try {
        const res = await prisma.exercise.findMany({
          where: whereClause,
          orderBy: { name: "asc" },
        });
        console.log("Found", res.length, "exercises for", g);
        res.slice(0, 5).forEach((e) => console.log("-", e.name));
      } catch (err) {
        console.error(
          "Error during findMany for",
          g,
          err && err.stack ? err.stack : err
        );
      }
    }
  } catch (err) {
    console.error("Unexpected error", err && err.stack ? err.stack : err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
