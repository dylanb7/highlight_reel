import type { NextPage, GetServerSideProps } from "next";
import PageWrap from "../../../components/layout/page-wrap";
import { LoadingSpinner } from "../../../components/misc/loading";
import { ProfileComponent } from "../../../components/profile-components";

import { api } from "../../../utils/trpc";
import { getServerHelpers } from "../../../utils/ssgHelper";
import { getAuth } from "@clerk/nextjs/dist/types/server-helpers.server";

const ProfileView: NextPage<{ userId: string }> = ({ userId }) => {
  const { data: profile, isLoading } = api.user.profileQuery.useQuery(userId);

  if (isLoading) return <LoadingSpinner loadingType={null} />;

  if (!profile)
    return (
      <div className="flex items-center justify-center text-xl text-slate-900 dark:text-white">
        Profile not found
      </div>
    );

  return (
    <PageWrap>
      <ProfileComponent profile={profile} />
    </PageWrap>
  );
};

export const getServerSideProps: GetServerSideProps<{
  userId: string;
}> = async (props) => {
  const { params } = props;

  if (!params) return { notFound: true };

  const { userId } = params;
  if (typeof userId !== "string") {
    return {
      notFound: true,
    };
  }

  const auth = getAuth(props.req);

  const owns = auth.userId === userId;

  const ssg = await getServerHelpers(props.req);

  await ssg.user.profileQuery.prefetch(userId);

  await ssg.user.profilePoolsQuery.prefetch({userId, type: "followed"});

  if(owns) {
    await ssg.user.profilePoolsQuery.prefetch({userId, type: "modded"});
    await ssg.user.profilePoolsQuery.prefetch({userId, type: "owned"});
  }
  

  await ssg.user.getUserBookmarksPaginated.prefetchInfinite({
    userId: userId,
    amount: 6,
  });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      userId,
    },
  };
};

export default ProfileView;
