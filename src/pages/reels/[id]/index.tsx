import type { GetServerSideProps, NextPage } from "next";
import React, { useMemo } from "react";

import { api } from "../../../utils/trpc";
import { LoadingSpinner } from "../../../components/misc/loading";
import { getServerHelpers } from "../../../utils/ssg-helper";
import Head from "next/head";

import type { HighlightGridActions } from "../../../components/contexts/highlight-grid-context";
import { HighlightGridContextProvider } from "../../../components/contexts/highlight-grid-context";
import type { HighlightThumbnail } from "../../../types/highlight-out";

import { PoolInfo } from "../../../components/pool-components/pool-info";
import PageWrap from "../../../components/layout/page-wrap";
import {
  Filters,
  useInitialDate,
} from "~/components/pool-components/pool-filters";
import {
  HighlightGridGroupsComponent,
  hourGrouping,
} from "~/components/highlight-components/grouped-highlight-grid";

import Image from 'next/image'
import { useEffect, useState } from "react";

const PoolView: NextPage<{ poolId: number }> = ({ poolId }) => {
  const { data: poolInfo } = api.pool.getPoolById.useQuery(poolId);

  return (
    <PageWrap>
      <Head>
        <title>{`Reel - ${poolInfo?.name ?? "Loading"}`}</title>
      </Head>
      <div className="flex h-full w-full flex-col items-start justify-start px-4 sm:px-8">
        <div className="mt-8 self-center pb-4">
          <PoolInfo poolId={poolId} />
        </div>

        <Filters poolId={poolId} />
        <LoadFeed poolId={poolId} />
      </div>
    </PageWrap>
  );
};

const LoadFeed: React.FC<{
  poolId: number;
}> = ({ poolId }) => {
  // const loadAmount = 12;

  // const initialCursor = useInitialDate();

  // const queryKey = {
  //   amount: loadAmount,
  //   poolId: poolId,
  //   initialCursor,
  // };

  // const util = api.useUtils();

  // const { data, isLoading, hasNextPage, fetchNextPage } =
  //   api.pool.getPoolHighlightsPaginated.useInfiniteQuery(queryKey, {
  //     getNextPageParam: (lastPage) => lastPage.nextCursor,
  //   });

  // const highlights = useMemo(() => {
  //   return data?.pages.flatMap((page) => page.highlights) ?? [];
  // }, [data?.pages]);

  // const { mutate: bookmark, isLoading: bookmarking } =
  //   api.user.toggleHighlight.useMutation({
  //     onSettled() {
  //       void util.pool.getPoolHighlightsPaginated.invalidate(queryKey);
  //     },
  //   });

  // const { mutate: upvote, isLoading: upvoting } =
  //   api.user.upvoteHighlight.useMutation({
  //     onSettled() {
  //       void util.pool.getPoolHighlightsPaginated.invalidate(queryKey);
  //     },
  //   });

  // if (isLoading) return <LoadingSpinner loadingType={"Loading Highlights"} />;

  // const actions: HighlightGridActions = {
  //   basePath: `reels/${poolId}/feed`,
  //   fetchMore: () => {
  //     void fetchNextPage();
  //   },
  //   hasMore: () => hasNextPage ?? false,
  //   bookmark: (highlight: HighlightThumbnail) => {
  //     bookmark({ highlightId: highlight.id, add: !highlight.bookmarked });
  //   },
  //   like: (highlight: HighlightThumbnail) => {
  //     upvote({ highlightId: highlight.id, like: !highlight.upvoted });
  //   },
  //   disabled: bookmarking || upvoting,
  // };

  // return (
  //   <HighlightGridContextProvider value={actions}>
  //     <HighlightGridGroupsComponent
  //       highlights={highlights}
  //       grouping={hourGrouping}
  //     />
  //   </HighlightGridContextProvider>
  // );


  return (
    <div className="border-2 border-black w-full max-w-lg flex h-32 m-auto rounded-md bg-sky-800 hover:bg-sky-900 hover:border-gray-300 hover:cursor-pointer">
      <div className="flex-1 w-[144px] h-[81px] m-auto relative ml-2">
        <ImageFallback src="/e3ec697b-9d84-416a-8ee6-134e2bb91081.jpg" fallbackSrc="/basketball-basket-png-39939.png"/>
      </div>
      <div className="flex-1 text-center m-auto">
        <p>January 1st</p>
        <p>2023</p>
        <p>9:23 am</p>
      </div>
      <div className="flex-1 w-[144px] h-[81px] m-auto relative mr-2">
        <ImageFallback src="/3f02bbfd-e07b-48f3-8a36-976ac967bd89.jpg" fallbackSrc="/basketball-basket-png-39939.png"/>
      </div>
    </div>
  );
};

function ImageFallback({ src, fallbackSrc, ...rest }: {src: any, fallbackSrc: any }) {
  const [imgSrc, set_imgSrc] = useState(src);

  useEffect(() => {
    set_imgSrc(src);
  }, [src]);

  return (
    <Image
      {...rest}
      src={imgSrc}
      alt="thumbnail"
      fill={true}
      className="object-contain"
      onLoadingComplete={(result) => {
        if (result.naturalWidth === 0) {
          // Broken image
          set_imgSrc(fallbackSrc);
        }
      }}
      onError={() => {
        set_imgSrc(fallbackSrc);
      }}
    />
  );
}

export const getServerSideProps: GetServerSideProps<{
  poolId: number;
}> = async (props) => {
  const { params } = props;
  if (!params?.id || typeof params.id !== "string") {
    return {
      notFound: true,
    };
  }

  const urlPool = params.id;

  const poolId = Number(urlPool);

  if (Number.isNaN(poolId)) {
    return {
      notFound: true,
    };
  }

  const ssgHelper = getServerHelpers(props.req);

  await ssgHelper.pool.getPoolById.prefetch(poolId);

  await ssgHelper.pool.getPoolHighlightsPaginated.prefetchInfinite({
    amount: 12,
    poolId: poolId,
  });

  await ssgHelper.pool.getWristbands.prefetch(poolId);

  return {
    props: {
      trpcState: ssgHelper.dehydrate(),
      poolId,
    },
  };
};

export default PoolView;
