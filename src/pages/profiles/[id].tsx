import type { User } from "@prisma/client";

import type { GetStaticProps } from "next";

import { useSession } from "next-auth/react";
import { prisma } from "../../server/db/client";

import { ProfileComponent } from "../../components/profile-components";
import { trpc } from "../../utils/trpc";
import { LoadingSpinner } from "../../components/loading";

const ProfileView = (props: { user: User }) => {
  const { user } = props;

  const { data: session } = useSession();

  if (!session || !session.user)
    return (
      <div className="items-center justify-center text-center text-slate-900 dark:text-white">
        Must be signed in to view profile
      </div>
    );

  return ProfileLayout(user.id, session.user.id);
};

const ProfileLayout = (id: string, refId: string) => {
  const { data: profile, isLoading } = trpc.user.profileQuery.useQuery({
    user: id,
    ref: refId,
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
