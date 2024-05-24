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
import { TwitterIcon, Mail } from "lucide-react";
import {
  EmailShareButton,
  TwitterShareButton,
  WhatsappShareButton,
} from "react-share";
import { type BaseHighlight } from "~/server/types/highlight-out";
import { IconButton, twIcons } from "../misc/icon-button";
import { useShareContext } from "../contexts/share-context";
import { getBaseUrl } from "~/utils/trpc";
import { buttonVariants } from "@/shadcn/ui/button";
import { cn } from "@/cnutils";
import { useEffect, useState } from "react";
import { CopyButton } from "../misc/copy-button";
import { Whatsapp } from "~/icons";

const ShareButton: React.FC<{
  highlight: BaseHighlight;
}> = ({ highlight }) => {
  const share = useShareContext();

  const relative = share(highlight);

  const [shareData, setShareData] = useState<ShareData | undefined>(undefined);

  useEffect(() => {
    setShareData({
      url: `${getBaseUrl()}${relative}`,
      title: "Share Highlight",
    });
  }, [relative]);

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
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: "default", size: "icon" }),
          "bg-transparent text-white hover:bg-foreground/40"
        )}
      >
        <Share2Icon />
      </DialogTrigger>
      <DialogContent className="mx-auto h-fit max-h-[calc(100%-2rem)] max-w-sm lg:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Highlight</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="flex-grid flex gap-5">
          {shareData && (
            <>
              <EmailShareButton url={shareData.url!} title={shareData.title}>
                <Mail className="[&_svg]:size-3 fill-text-primary-foreground relative z-10 h-6 w-6" />
              </EmailShareButton>
              <TwitterShareButton url={shareData.url!} title={shareData.title}>
                <TwitterIcon className="[&_svg]:size-3 fill-text-primary-foreground relative z-10 h-6 w-6" />
              </TwitterShareButton>
              <WhatsappShareButton url={shareData.url!} title={shareData.title}>
                <Whatsapp className="[&_svg]:size-3 fill-text-primary-foreground relative z-10 h-6 w-6" />
              </WhatsappShareButton>
              <CopyButton
                value={shareData.url!}
                copyMessage="Copied highlight to clipboard"
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareButton;
