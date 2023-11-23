"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shadcn/ui/dialog";
import { Share2Icon } from "@radix-ui/react-icons";
import { useRouter } from "next/router";
import {
  EmailShareButton,
  EmailIcon,
  TwitterShareButton,
  WhatsappShareButton,
  WhatsappIcon,
  TwitterIcon,
} from "react-share";
import { type BaseHighlight } from "~/types/highlight-out";
import { IconButton, twIcons } from "../misc/icon-button";

export const ShareButton: React.FC<{
  highlight: BaseHighlight;
  adaptive: boolean;
}> = ({ highlight, adaptive }) => {
  const router = useRouter();

  const url = `${router.basePath}/reels/${encodeURIComponent(
    ""
  )}/feed/${encodeURIComponent(highlight.timestampUtc ?? "")}`;

  const shareData: ShareData = {
    url,
    title: "Share Highlight",
  };

  if (
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare(shareData)
  ) {
    return (
      <IconButton
        onClick={() => {
          void navigator.share(shareData);
        }}
      >
        <Share2Icon className={twIcons()} />
      </IconButton>
    );
  }
  return (
    <Dialog>
      <DialogTrigger>
        <Share2Icon
          className={
            adaptive
              ? "h-5 w-5 text-slate-900 hover:text-slate-800 dark:text-white dark:hover:text-gray-100"
              : twIcons()
          }
        />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Highlight</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="flex-grid flex gap-2">
          <EmailShareButton url={shareData.url!} title={shareData.title}>
            <EmailIcon />
          </EmailShareButton>
          <TwitterShareButton url={shareData.url!} title={shareData.title}>
            <TwitterIcon />
          </TwitterShareButton>
          <WhatsappShareButton url={shareData.url!} title={shareData.title}>
            <WhatsappIcon />
          </WhatsappShareButton>
          <button
            onClick={() => {
              if (typeof navigator !== undefined) {
                void navigator.clipboard.writeText(shareData.url!);
              }
            }}
            className="rws-icon"
            style={{ background: "#718096" }}
          >
            <svg fill="white" viewBox={"0 0 24 24"} width={64} height={64}>
              <path d="M16 1H4a2 2 0 00-2 2v14h2V3h12V1zm3 4H8a2 2 0 00-2 2v14c0 1.1.9 2 2 2h11a2 2 0 002-2V7a2 2 0 00-2-2zm0 16H8V7h11v14z" />
            </svg>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareButton;
