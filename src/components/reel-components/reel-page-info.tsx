import { ReelComponent } from "./highlight-reel-card";
import SignInComponent from "../misc/sign-in";
import { type ReelInfo } from "../../server/types/pool-out";
import { useAuth } from "@clerk/nextjs";

export const ReelPageInfo: React.FC<{
  reelInfo: ReelInfo;
}> = ({ reelInfo: poolInfo }) => {
  const isAuthed = useAuth().userId;

  const followInfo = {
    follows: poolInfo?.followInfo?.follows ?? false,
    requested: poolInfo?.followInfo?.requested ?? false,
  };

  const privateNoSession = poolInfo && !poolInfo.isPublic && !isAuthed;

  const privateNoFollow =
    poolInfo && !poolInfo.isPublic && !followInfo.follows && isAuthed;

  return (
    <ReelComponent reel={poolInfo} hasLink={false}>
      <div className="flex flex-col">
        {privateNoSession && (
          <>
            <p className="mt-5 font-semibold text-slate-900 dark:text-white">
              This <span className="font-semibold text-indigo-500">Reel</span>{" "}
              is private. Sign in to follow.
            </p>
            <div className="mt-2 flex items-center justify-center">
              <SignInComponent />
            </div>
          </>
        )}
        {privateNoFollow && (
          <p className="mt-5 text-center font-semibold text-slate-900 dark:text-white">
            This <span className="font-semibold text-indigo-500">Reel</span> is
            private. You can request to follow it.
          </p>
        )}
      </div>
    </ReelComponent>
  );
};
