import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { trpc } from "../utils/trpc";

import "../styles/globals.css";
import PageWrap from "../components/layout/page-wrap";
import { Provider } from "jotai";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <Provider>
      <SessionProvider session={session}>
        <PageWrap>
          <Component {...pageProps} />
        </PageWrap>
      </SessionProvider>
    </Provider>
  );
};

export default trpc.withTRPC(MyApp);
