import { HighlightPool, User } from "@prisma/client";

import { GetStaticProps } from "next";

import { useSession } from "next-auth/react";
import { prisma } from "../../server/db/client";

import {
  FollowedPoolScroll,
  ProfileData,
  ProfileHighlights,
} from "../../components/profile-components";

const ProfileView = (props: {
  user: User & {
    _count: {
      followedBy: number;
      following: number;
    };
  };
}) => {
  const { user } = props;

  const { data: session } = useSession();

  if (!user) return <h3>Profile not found</h3>;

  return (
    <div className="flex flex-col justify-start pt-2">
      <ProfileData user={user} />
      <FollowedPoolScroll id={user.id} refId={session?.user?.id} />
      <ProfileHighlights id={user.id} refId={session?.user?.id} />
    </div>
  );
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
    include: {
      _count: {
        select: {
          followedBy: true,
          following: true,
        },
      },
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
