import { Highlight, HighlightPool } from "@prisma/client";
import { GetStaticProps, NextPage } from "next";
import { useSession } from "next-auth/react";

const PoolView = (props: { pool: HighlightPool }) => {
  if (!props.pool) throw new Error("No Pool By ID");

  return <p>{props.pool.name}</p>;
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params || !params.id || typeof params.id !== "string") {
    return {
      notFound: true,
    };
  }

  const pool = await prisma?.highlightPool.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!pool) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      pool: JSON.parse(JSON.stringify(pool)),
    },
    revalidate: 60,
  };
};

export async function getStaticPaths() {
  return { paths: [], fallback: "blocking" };
}

export default PoolView;
