import type { PlanetScaleDatabase } from "drizzle-orm/planetscale-serverless";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import { connect } from "@planetscale/database";
import * as schema from "./schema";

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
};

const connection = connect(config);

export const db = drizzle(connection, { schema: schema });

export type dbType = PlanetScaleDatabase<typeof schema>;
