import type { GetServerSideProps, NextPage } from "next";

import { useSession } from "next-auth/react";

import { ProfileComponent } from "../../components/profile-components";
import { api } from "../../utils/trpc";
import { LoadingSpinner } from "../../components/loading";
import { generateSSGHelper } from "../../utils/ssgHelper";
import { getServerAuthSession } from "../../server/common/get-server-auth-session";

const ProfileView: NextPage<{ userId: string }> = ({ userId }) => {
  const { data: session } = useSession();

  const { data: profile, isLoading } = api.user.profileQuery.useQuery({
    user: userId,
    ref: session?.user?.id,
  });

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
  if (!params || !params.id || typeof params.id !== "string") {
    return {
      notFound: true,
    };
  }

  const userId = params.id;

  const ssg = generateSSGHelper();

  const session = await getServerAuthSession(props);

  await ssg.user.profileQuery.prefetch({
    ref: session?.user?.id,
    user: userId,
  });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      userId,
    },
  };
};

export default ProfileView;
