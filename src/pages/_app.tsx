import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { trpc } from "../utils/trpc";

import "../styles/globals.css";
import NavBar from "../components/layout/navbar";
import PageWrap from "../components/layout/page-wrap";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <PageWrap>
        <Component {...pageProps} />
      </PageWrap>
    </SessionProvider>
  );
};

export default trpc.withTRPC(MyApp);
