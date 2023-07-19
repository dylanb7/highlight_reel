import { Config } from "drizzle-kit";

export default {
  database: "highlight_reel",
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  schema: "src/server/db/schema.ts",
} satisfies Config;
