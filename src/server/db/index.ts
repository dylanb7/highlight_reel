import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import postgres from "postgres";

/*const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
};*/
const connectionString = process.env.DATABASE_URL!;

let connection: postgres.Sql;

if (process.env.NODE_ENV === "production") {
  connection = postgres(connectionString, { prepare: false });
} else {
  const globalConnection = global as typeof globalThis & {
    connection: postgres.Sql;
  };

  if (!globalConnection.connection) {
    globalConnection.connection = postgres(connectionString, {
      prepare: false,
    });
  }

  connection = globalConnection.connection;
}

export const db = drizzle(connection, { schema: schema });

export type dbType = typeof db;
