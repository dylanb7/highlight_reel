import { Config } from "drizzle-kit";

export default {
  connectionString:
    'mysql://j5qb8xs62jxemhn3w141:pscale_pw_HgXj7mBZJtWhY5SUhf6QZmiE5Pkv3KKlC7rpMxQ0pFI@aws.connect.psdb.cloud/highlight_reel?ssl={"rejectUnauthorized":true}',
  schema: "src/server/db/schema.ts",
} satisfies Config;
