import type { NextPage, GetServerSideProps } from "next";
import { LoadingSpinner } from "../../../components/misc/loading";
import { ProfileComponent } from "../../../components/profile-components";
import { generateSSGHelper } from "../../../utils/ssgHelper";
import { api } from "../../../utils/trpc";

const ProfileView: NextPage<{ userId: string }> = ({ userId }) => {
  const { data: profile, isLoading } = api.user.profileQuery.useQuery(userId);

  if (isLoading) return <LoadingSpinner loadingType={null} />;

  if (!profile)
    return (
      <div className="flex items-center justify-center text-xl text-slate-900 dark:text-white">
        Profile not found
      </div>
    );

  return <ProfileComponent profile={profile} />;
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

  const ssg = generateSSGHelper();

  await ssg.user.profileQuery.prefetch(userId);

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
