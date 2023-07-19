/* eslint-disable @typescript-eslint/no-base-to-string */
import { createNextApiHandler } from "@trpc/server/adapters/next";

import { env } from "../../../env/server.mjs";
import { createContext } from "../../../server/trpc/context";
import { appRouter } from "../../../server/trpc/router/_app";

// export API handler
export default createNextApiHandler({
  router: appRouter,
  createContext,
  onError:
    env.NODE_ENV === "development"
      ? ({ path, error }) => {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          console.error(`❌ tRPC failed on ${path}: ${error}`);
        }
      : undefined,
});
