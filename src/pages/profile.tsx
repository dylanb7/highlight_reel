import { api } from "~/utils/trpc";
import { LoadingSpinner } from "~/components/misc/loading";
import { UserFinish } from "~/components/profileComponents/user-finish";

import PageWrap from "~/components/layout/page-wrap";
import { HomeTabs } from "~/components/layout/home-nav";
import { type NextPage } from "next";
import { useAuth } from "@clerk/nextjs";
import { Label } from "@/shadcn/ui/label";
import { ProfilePage } from "~/components/profileComponents/profile-page";

const LoadedAuth: React.FC<{ userId: string }> = ({ userId }) => {
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
        <ProfilePage />
      )}
      <HomeTabs selected={"profile"} />
    </PageWrap>
  );
};

const UserProfilePage: NextPage<{ userId: string }> = () => {
  const { userId, isLoaded } = useAuth();

  if (!isLoaded) return <LoadingSpinner loadingType={"Loading Session"} />;

  if (!userId)
    return (
      <div className="container mx-auto">
        <Label>You are signed out</Label>
      </div>
    );

  return <LoadedAuth userId={userId} />;
};

export default UserProfilePage;
