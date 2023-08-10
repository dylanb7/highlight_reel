import "dotenv/config";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import { connect } from "@planetscale/database";
import * as schema from "./schema";

/*const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
};*/
const config = {
  url: process.env.DATABASE_URL,
};

const connection = connect(config);

export const db = drizzle(connection, { schema: schema });

export type dbType = typeof db;
