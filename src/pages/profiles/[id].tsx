import { HighlightPool, User } from "@prisma/client";

import { GetStaticProps } from "next";

import { useSession } from "next-auth/react";
import { prisma } from "../../server/db/client";

import { ProfileComponent } from "../../components/profile-components";
import { trpc } from "../../utils/trpc";
import { LoadingSpinner } from "../../components/loading";

const ProfileView = (props: { user: User }) => {
  const { user } = props;

  const { data: session } = useSession();

  const { data: profile, isLoading } = trpc.user.profileQuery.useQuery({
    user: user.id,
    ref: session?.user?.id ?? "",
  });

  if (isLoading) return <LoadingSpinner loadingType={null} />;

  if (!session || !session.user)
    return (
      <div className="items-center justify-center text-center text-slate-900 dark:text-white">
        Must be signed in to view profile
      </div>
    );

  if (!user || !profile) return <h3>Profile not found</h3>;

  return <ProfileComponent profile={profile} />;
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params || !params.id || typeof params.id !== "string") {
    return {
      notFound: true,
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!user) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      user: user,
    },
  };
};

export async function getStaticPaths() {
  return { paths: [], fallback: "blocking" };
}

export default ProfileView;
