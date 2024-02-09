"use client";

import React from "react";
import { z } from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { api } from "~/utils/trpc";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shadcn/ui/form";
import { Input } from "@/shadcn/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/ui/select";
import { Button } from "@/shadcn/ui/button";

const profileSchema = z.object({
  username: z
    .string({
      required_error: "Must provide username",
    })
    .min(5)
    .max(25),
  public: z.enum(["Public", "Private"], { description: "HI" }),
});

type SchemaType = z.infer<typeof profileSchema>;

export const UserFinish: React.FC = () => {
  const form = useForm<SchemaType>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
    },
  });

  const utils = api.useUtils();

  const { mutate: finishProfile } = api.user.finishProfile.useMutation({
    onSuccess() {
      void utils.user.fromId.invalidate();
    },
  });

  function submitAction(val: SchemaType) {
    finishProfile({
      public: val.public == "Public",
      username: val.username,
    });
  }
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 pt-12">
      <div className="flex w-full max-w-sm flex-col gap-0">
        <p className="block p-2 text-center text-xl font-bold text-slate-900 dark:text-white">
          Finish your profile to start interacting with{" "}
          <span className="text-indigo-500">Reels</span>
        </p>
      </div>
      <span className="h-1 w-full max-w-md rounded-lg bg-slate-900 dark:bg-white" />
      <Form {...form}>
        <form
          onSubmit={() => {
            form.handleSubmit(submitAction);
          }}
          className="w-full max-w-md"
        >
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field}></Input>
                </FormControl>
                <FormDescription>
                  This is your public display name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="public"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Privacy</FormLabel>
                <Select onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account privacy" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={"Public"}>Public</SelectItem>
                    <SelectItem value={"Private"}>Private</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Other users can see public accounts.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type={"submit"} size={"lg"} className="mt-2 bg-indigo-500">
            Submit
          </Button>
        </form>
      </Form>
    </div>
  );
};
