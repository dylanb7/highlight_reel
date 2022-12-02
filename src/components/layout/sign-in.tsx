import { signIn, signOut, useSession } from "next-auth/react";
import { trpc } from "../../utils/trpc";

const CompleteProfile: React.FC = () => {
  const { data: sessionData } = useSession();

  const { data: profileData, isFetching } = trpc.user.userProfile.useQuery(
    sessionData?.user?.id ?? "",
    { enabled: sessionData?.user?.id !== undefined }
  );

  return (
    <div className="flex flex-row items-center justify-center gap-4">
      {isFetching && !profileData && (
        <p className="justify-center font-semibold text-slate-900">
          Loading...
        </p>
      )}
      {profileData && (
        <p className="font-semibold text-slate-900">
          {profileData.profile?.username ?? "No Name"}
          {sessionData && !profileData && (
            <button className="rounded-full bg-indigo-500 px-10 py-3 font-semibold text-white no-underline transition hover:bg-indigo-700">
              Finish Profile
            </button>
          )}
        </p>
      )}
    </div>
  );
};

const SignInComponent: React.FC = () => {
  const { data: sessionData } = useSession();

  return (
    <div className="flex flex-row gap-4">
      <CompleteProfile />
      <button
        className="rounded-full bg-indigo-500 px-4 py-2 font-semibold text-white no-underline transition hover:bg-indigo-700"
        onClick={sessionData ? () => signOut() : () => signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
};

export default SignInComponent;
