import { type Config } from "drizzle-kit";
import "dotenv/config";

export default {
  schema: "src/server/db/schema.ts",
  driver: "mysql2",
  out: "./drizzle",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,

    /*database: "highlight_reel",
    host: process.env.DATABASE_HOST!,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,*/
  },
} satisfies Config;
