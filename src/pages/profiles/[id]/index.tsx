import type { NextPage, GetServerSideProps } from "next";
import PageWrap from "../../../components/layout/page-wrap";
import { ProfileComponent } from "../../../components/profile-components";
import { getServerHelpers } from "../../../utils/ssgHelper";
import { buildClerkProps, getAuth } from "@clerk/nextjs/server";


const ProfileView: NextPage<{ userId: string }> = ({ userId }) => {
  return (
    <PageWrap>
      <ProfileComponent userId={userId} />
    </PageWrap>
  );
};

export const getServerSideProps: GetServerSideProps<{
  userId: string;
}> = async (props) => {
  const { params } = props;

  if (!params) return { notFound: true };

  const { id } = params;

  if (typeof id !== "string") {
    return {
      notFound: true,
    };
  }

  const auth = getAuth(props.req);

  const owns = auth.userId === id;

  const ssg = getServerHelpers(props.req);

  await ssg.user.profileQuery.prefetch(id);

  await ssg.user.profilePoolsQuery.prefetchInfinite({ userId: id, type: "followed" });

  if (owns) {
    await ssg.user.profilePoolsQuery.prefetchInfinite({ userId: id, type: "modded" });
    await ssg.user.profilePoolsQuery.prefetchInfinite({ userId: id, type: "owned" });
  }


  await ssg.user.getUserBookmarksPaginated.prefetchInfinite({
    userId: id,
    amount: 6,
  });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      userId: id,
      ...buildClerkProps(props.req)
    },
  };
};

export default ProfileView;
