import { useMemo, useState } from "react";
//import { api } from "../../trpc-client";

import { Button, buttonVariants } from "@/shadcn/ui/button";
import { Calendar } from "@/shadcn/ui/calendar";
import dayjs from "dayjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/ui/select";
import { X, ChevronsUpDown, ChevronsDownUp } from "lucide-react";
import { CalendarIcon } from "@radix-ui/react-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shadcn/ui/dialog";
import { cn } from "@/cnutils";
import { Label } from "@/shadcn/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shadcn/ui/collapsible";

import { Separator } from "@/shadcn/ui/separator";
import { useRouter } from "next/router";
import { fromUnix, parseFrom } from "~/utils/date-helpers";

interface DateFilterProps {
  onDate: (date: Date) => void;
}

export const DateFilter: React.FC<DateFilterProps> = ({ onDate }) => {
  const { query } = useRouter();

  const { from } = query;

  const [open, setOpen] = useState(false);

  const value = useMemo(() => {
    const unix = parseFrom(from);

    const initial = unix ? fromUnix(unix) : undefined;

    return initial ? dayjs(initial).endOf("day").toDate() : undefined;
  }, [from]);

  const [startDate, setStartDate] = useState<Date | undefined>(value);

  const onSelect = (value: Date) => {
    const newDate = dayjs(value).endOf("day").toDate();
    setStartDate(newDate);
    onDate(newDate);
    setOpen(false);
  };

  return (
    <div className="flex flex-col items-start justify-start pb-3">
      <h3 className="text-md pb-1 font-semibold text-slate-900 dark:text-white">
        Start From
      </h3>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          className={cn(
            buttonVariants({ variant: "outline" }),
            buttonVariants({ variant: "link" }),
            "w-[280px] justify-start text-left font-normal dark:hover:border dark:hover:border-white dark:hover:bg-slate-950",
            !startDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {startDate ? (
            dayjs(startDate).format("MMM DD, YYYY")
          ) : (
            <span>Pick a date</span>
          )}
        </DialogTrigger>
        <DialogContent className="mx-auto max-w-sm p-1">
          <DialogHeader className="p-2">
            <DialogTitle>Select Date</DialogTitle>
            <DialogDescription>
              Highlight feed will jump to selection
            </DialogDescription>
          </DialogHeader>
          <div className="mx-auto flex flex-col gap-1">
            <Select
              onValueChange={(value) =>
                onSelect(dayjs().subtract(parseInt(value), "day").toDate())
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="1">Yesterday</SelectItem>
                <SelectItem value="3">3 days ago</SelectItem>
                <SelectItem value="7">Last week</SelectItem>
              </SelectContent>
            </Select>
            <div className="rounded-md border">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(val) => {
                  if (val) {
                    onSelect(val);
                  }
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface BandProps {
  wristbands: string[];
  onSelect: (band: string) => void;
  selected?: string;
}

export const WristBands: React.FC<BandProps> = ({
  wristbands,
  selected,
  onSelect,
}) => {
  return (
    <div className="flex w-full flex-col pb-3">
      <h3 className="text-md pb-1 font-semibold text-slate-900 dark:text-white">
        Wristband
      </h3>

      <div className="flex w-full flex-wrap gap-2">
        <WristbandChip active={!selected} name={"All"} onSelect={onSelect} />
        {wristbands.map((data) => (
          <WristbandChip
            active={selected ? data === selected : false}
            name={data}
            key={data}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};

const WristbandChip: React.FC<{
  active: boolean;
  name: string;
  onSelect: (band: string) => void;
}> = ({ active, name, onSelect }) => {
  return (
    <Button
      size={"sm"}
      className={cn(
        !active
          ? buttonVariants({ variant: "link", size: "sm" })
          : "h-9 px-3 hover:bg-indigo-500",
        "text-sm font-semibold no-underline shadow-sm ",
        active
          ? "bg-indigo-500 text-white "
          : "bg-indigo-200 text-indigo-800 hover:bg-indigo-300 ",
        "disabled:opacity-50"
      )}
      onClick={
        active
          ? undefined
          : () => {
              onSelect(name);
            }
      }
    >
      {name}
    </Button>
  );
};

export const Filters: React.FC<{
  reelId: number;
  bandProps: BandProps;
  dateProps: DateFilterProps;
}> = ({ reelId, bandProps, dateProps }) => {
  const [isOpen, setOpen] = useState(false);

  const { push, query } = useRouter();

  const { from } = query;

  const parsedFrom = parseFrom(from);

  return (
    <Collapsible
      onOpenChange={(open) => {
        setOpen(open);
      }}
      className="flex w-full flex-col"
    >
      <div className="flex flex-wrap gap-2">
        <CollapsibleTrigger>
          <Label
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <>
              {isOpen ? (
                <ChevronsDownUp className="h-5 w-5" />
              ) : (
                <ChevronsUpDown className="h-5 w-5" />
              )}
            </>
            &nbsp;Filters
          </Label>
        </CollapsibleTrigger>
        {bandProps.selected && (
          <Button
            size={"sm"}
            variant={"outline"}
            onClick={() => {
              delete query.bandId;
              void push({
                pathname: "/reels/[id]",
                query: { ...query, id: reelId },
              });
            }}
          >
            <X className="h-5 w-5" />
            &nbsp;{`Wristband: ${bandProps.selected}`}
          </Button>
        )}
        {parsedFrom && (
          <Button
            size={"sm"}
            variant={"outline"}
            onClick={() => {
              delete query.from;
              void push({
                query: query,
              });
            }}
          >
            <X className="h-5 w-5" />
            &nbsp;
            {`From: ${dayjs(fromUnix(parsedFrom)).format("MMM DD, YYYY")}`}
          </Button>
        )}
      </div>
      <CollapsibleContent>
        <Separator className="my-2" />
        <div className="flex flex-wrap">
          <WristBands {...bandProps} />
          <DateFilter {...dateProps} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
