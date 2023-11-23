import { type GetServerSideProps, type NextPage } from "next";
import { buildClerkProps, getAuth } from "@clerk/nextjs/server";
import { getServerHelpers } from "~/utils/ssg-helper";
import { api } from "~/utils/trpc";
import { LoadingSpinner } from "~/components/misc/loading";
import { UserFinish } from "~/components/user-finish";
import { ProfileComponent } from "~/components/profile-components";
import PageWrap from "~/components/layout/page-wrap";
import { HomeTabs } from "~/components/layout/home-nav";

const ProfilePage: NextPage<{ userId: string }> = ({ userId }) => {
  const { data: profile, isLoading } = api.user.profileQuery.useQuery(userId);

  return (
    <PageWrap>
      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center">
          <LoadingSpinner loadingType={null} />
        </div>
      ) : !profile ? (
        <UserFinish />
      ) : (
        <ProfileComponent userId={userId} />
      )}
      <HomeTabs selected={"profile"} />
    </PageWrap>
  );
};

export default ProfilePage;

export const getServerSideProps: GetServerSideProps = async (props) => {
  const auth = getAuth(props.req);

  const id = auth.userId;

  if (!id)
    return {
      notFound: true,
    };

  const ssg = getServerHelpers(props.req);

  await ssg.user.profileQuery.prefetch(id);

  await ssg.user.profilePoolsQuery.prefetchInfinite({
    userId: id,
    type: "followed",
  });

  await ssg.user.profilePoolsQuery.prefetchInfinite({
    userId: id,
    type: "modded",
  });
  await ssg.user.profilePoolsQuery.prefetchInfinite({
    userId: id,
    type: "owned",
  });

  await ssg.user.getUserBookmarksPaginated.prefetchInfinite({
    userId: id,
    amount: 6,
  });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      userId: id,
      ...buildClerkProps(props.req),
    },
  };
};
