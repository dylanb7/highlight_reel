import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Separator from "@radix-ui/react-separator";
import Link from "next/link";
import { useState } from "react";
import type {
  FetchInfo,
  PoolUserFetch,
  UserFetch,
  UserInfo,
} from "../types/user-out";
import { trpc } from "../utils/trpc";
import { ProfileFollowButton } from "./follow-profile";
import { LoadingSpinner } from "./loading";

export const ProfileRow: React.FC<{
  profile: UserInfo;
  info: FetchInfo;
  dismiss: () => void;
}> = ({ profile, info, dismiss }) => {
  return (
    <div className="flex flex-row items-center justify-between rounded-lg bg-gray-200 p-2 shadow-sm dark:bg-slate-800">
      <Link
        href={"/profiles/" + encodeURIComponent(profile.id)}
        onClick={() => {
          dismiss();
        }}
      >
        <p className="truncate font-semibold text-slate-900 dark:text-white">
          {profile.username}
        </p>{" "}
      </Link>
      <ProfileFollowButton info={info} profile={profile} />
    </div>
  );
};

const UserRows: React.FC<{
  users: UserInfo[];
  isLoading: boolean;
  info: FetchInfo;
  dismiss: () => void;
}> = ({ users, isLoading, info, dismiss }) => {
  if (isLoading) return <LoadingSpinner loadingType={""} />;
  if (users.length === 0)
    return (
      <div className="flex items-center justify-center text-center text-white">
        No Profiles
      </div>
    );
  return (
    <div className="flex h-full w-full flex-col gap-2">
      {users.map((user) => (
        <ProfileRow
          key={user.id}
          profile={user}
          info={info}
          dismiss={dismiss}
        />
      ))}
    </div>
  );
};

const PoolRowFetch: React.FC<{ fetch: PoolUserFetch; dismiss: () => void }> = ({
  fetch,
  dismiss,
}) => {
  const { data: users, isLoading } = trpc.pool.getPoolFollowers.useQuery({
    poolId: fetch.poolId,
    refId: fetch.refId,
  });

  return (
    <UserRows
      users={users ?? []}
      isLoading={isLoading}
      info={{
        userFetch: undefined,
        poolFetch: fetch,
      }}
      dismiss={dismiss}
    />
  );
};

const UserRowFetch: React.FC<{ fetch: UserFetch; dismiss: () => void }> = ({
  fetch,
  dismiss,
}) => {
  if (fetch.following)
    return <FollowingFetch fetch={fetch} dismiss={dismiss} />;
  return <FollowersFetch fetch={fetch} dismiss={dismiss} />;
};

const FollowersFetch: React.FC<{ fetch: UserFetch; dismiss: () => void }> = ({
  fetch,
  dismiss,
}) => {
  const { data: users, isLoading } = trpc.user.getFollowers.useQuery({
    userId: fetch.userId,
    refId: fetch.refId,
  });
  return (
    <UserRows
      users={users ?? []}
      isLoading={isLoading}
      info={{
        userFetch: fetch,
        poolFetch: undefined,
      }}
      dismiss={dismiss}
    />
  );
};

const FollowingFetch: React.FC<{ fetch: UserFetch; dismiss: () => void }> = ({
  fetch,
  dismiss,
}) => {
  const { data: users, isLoading } = trpc.user.getFollowing.useQuery({
    userId: fetch.userId,
    refId: fetch.refId,
  });
  return (
    <UserRows
      users={users ?? []}
      isLoading={isLoading}
      info={{
        userFetch: fetch,
        poolFetch: undefined,
      }}
      dismiss={dismiss}
    />
  );
};

export const ProfileList: React.FC<{
  text: string;
  header: string;
  fetch: FetchInfo;
}> = ({ text, header, fetch }) => {
  const [open, setOpen] = useState(false);

  const dismiss = () => {
    setOpen(false);
  };

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger className="cursor-pointer truncate text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-gray-400 hover:dark:text-white">
        {text}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-full max-w-md -translate-y-1/2 -translate-x-1/2 ">
          <div className="m-4 flex flex-col rounded-lg bg-white p-2 shadow-lg dark:bg-slate-600">
            <div className="flex flex-row items-center justify-between px-2">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {header}
              </p>
              <Dialog.Close>
                <Cross2Icon className="h-6 w-6 text-black hover:text-gray-700 dark:text-white dark:hover:text-gray-400" />
              </Dialog.Close>
            </div>
            <Separator.Root
              orientation="horizontal"
              decorative
              className="my-1 h-px bg-slate-900 dark:bg-white"
            />
            <ScrollArea.Root className="overflow-hidden">
              <ScrollArea.Viewport className="h-full max-h-80 w-full pr-3">
                {open && fetch.userFetch && (
                  <UserRowFetch fetch={fetch.userFetch} dismiss={dismiss} />
                )}
                {open && fetch.poolFetch && (
                  <PoolRowFetch fetch={fetch.poolFetch} dismiss={dismiss} />
                )}
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                orientation="vertical"
                className="flex w-2 rounded-full bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-800"
              >
                <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-900 dark:bg-white" />
              </ScrollArea.Scrollbar>
              <ScrollArea.Corner />
            </ScrollArea.Root>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
