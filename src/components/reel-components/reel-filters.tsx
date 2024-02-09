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

interface DateFilterProps {
  onDate: (date: Date) => void;
  initial?: Date;
}

export const DateFilter: React.FC<DateFilterProps> = ({ onDate, initial }) => {
  const value = useMemo(() => getEnd(initial), [initial]);

  const [startDate, setStartDate] = useState<Date>(value);

  const onSelect = (value: Date) => {
    setStartDate(dayjs(value).endOf("day").toDate());
    onDate(startDate);
  };

  return (
    <div className="flex flex-col items-start justify-start pb-3">
      <h3 className="pb-3 text-lg font-semibold text-slate-900 dark:text-white">
        Jump to
      </h3>

      <Dialog>
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
      <h3 className="pb-3 text-lg font-semibold text-slate-900 dark:text-white">
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
          ? buttonVariants({ variant: "link" })
          : "h-10 px-4 py-2 hover:bg-indigo-500",
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

const getEnd = (date?: Date) => {
  const end = date ?? new Date();
  return dayjs(end).endOf("day").toDate();
};

export const Filters: React.FC<{
  bandProps: BandProps;
  dateProps: DateFilterProps;
}> = ({ bandProps, dateProps }) => {
  return (
    <div className="flex flex-col">
      <WristBands {...bandProps} />
      <DateFilter {...dateProps} />
    </div>
  );
};
