import { prisma } from "../src/server/db/client";
import { faker } from "@faker-js/faker";

async function topSeed(
  length = 16,
  poolsMin = 0,
  poolsMax = 4,
  highlightsMin = 1,
  highlightsMax = 20
) {
  const userData = Array.from({ length: length }).map(() => {
    const poolsLength = Math.floor(
      poolsMin + Math.random() * (poolsMax - poolsMin)
    );
    return {
      username: faker.name.fullName(),
      image: faker.image.avatar(),
      public: Math.random() > 0.5,
      ownedPools: {
        create: Array.from({ length: poolsLength }).map(() => {
          const highlightsLength = Math.floor(
            highlightsMin + Math.random() * (highlightsMax - highlightsMin)
          );
          return {
            name: faker.name.jobArea(),
            public: Math.random() > 0.5,
            highlights: {
              create: Array.from({ length: highlightsLength }).map(() => {
                return {
                  link: faker.internet.url(),
                };
              }),
            },
          };
        }),
      },
    };
  });

  for (const user of userData) {
    await prisma.user.create({ data: user });
  }
}

topSeed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
