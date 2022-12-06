"use client";

import React from "react";
import { useState } from "react";
import { z, ZodError } from "zod";
import { trpc } from "../utils/trpc";
import { useSession } from "next-auth/react";
import { Field, Form, Formik } from "formik";

const profileSchema = z.object({
  text: z
    .string({
      required_error: "Must provide username",
    })
    .min(5)
    .max(25),
  public: z.boolean(),
});

export const UserFinish: React.FC = () => {
  const { data: session } = useSession();

  const [success, setSuccess] = useState(false);

  const [error, setError] = useState("");

  const utils = trpc.useContext();

  const { mutate: finishProfile, isLoading } =
    trpc.user.finishProfile.useMutation({
      onError(error, variables, context) {
        setError(error.message);
      },
      onSuccess() {
        setSuccess(true);
        utils.user.fromId.invalidate();
      },
    });

  async function submitAction(values: { username: string; status: string }) {
    const submitObj = {
      text: values.username,
      public: values.status == "Public",
    };
    try {
      profileSchema.parse(submitObj);
    } catch (e) {
      var didSet = false;
      JSON.parse((e as ZodError).message, (key, value) => {
        if (key == "message") {
          setError(value);
          didSet = true;
          return;
        }
      });
      if (!didSet) {
        setError("Invalid Input");
      }
      return;
    }
    if (!session || !session.user) {
      setError("User Logged Out");
      return;
    }
    setError("");
    finishProfile({
      public: submitObj.public,
      username: submitObj.text,
      userId: session.user.id,
    });
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <div className="flex w-full max-w-sm flex-col gap-0">
        <p className="block p-4 text-center text-2xl font-bold text-slate-900">
          Finish your profile to start interacting with{" "}
          <span className="text-indigo-500">Reels</span>
        </p>
        <span className="h-1 w-full rounded-lg bg-slate-900" />
      </div>
      <div className="w-full max-w-md">
        <Formik
          initialValues={{ username: "", status: "Private" }}
          onSubmit={(values: { username: string; status: string }, actions) => {
            submitAction(values);
          }}
        >
          {(props) => (
            <Form
              onSubmit={props.handleSubmit}
              className="mb-4 rounded-lg bg-white px-8 pt-6 pb-8 shadow-lg"
            >
              <label className="block p-2 text-center text-2xl font-bold text-slate-900">
                Profile Info
              </label>
              {error && (
                <p className="p-2 text-center font-bold text-red-600">
                  {error}
                </p>
              )}
              {success && (
                <p className="p-2 text-center font-bold text-slate-900">
                  Account Created!
                </p>
              )}
              <div className="mb-6 md:flex md:items-center">
                <div className="md:w-1/3">
                  <label className="mb-1 block pr-4 font-bold text-gray-500 md:mb-0 md:text-right">
                    Username
                  </label>
                </div>
                <div className="md:w-2/3">
                  <input
                    className="w-full appearance-none rounded border-2 border-gray-200 bg-gray-200 py-2 px-4 leading-tight text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    id="inline-full-name"
                    onChange={props.handleChange}
                    onBlur={props.handleBlur}
                    value={props.values.username}
                    type="text"
                    name="username"
                    disabled={success || isLoading}
                    placeholder="Jane Doe"
                  />
                </div>
              </div>
              <div className="mb-6 md:flex md:items-center">
                <div className="md:w-1/3">
                  <label className="mb-1 block pr-4 font-bold text-gray-500 md:mb-0 md:text-right">
                    Status
                  </label>
                </div>
                <div className="md:w-2/3">
                  <Field
                    className="form-select form-select-lg block w-full appearance-none rounded border border-gray-200 bg-gray-200 py-3 px-4 pr-8 leading-tight text-gray-700 focus:border-gray-500 focus:bg-white focus:outline-none"
                    value={props.values.status}
                    as="select"
                    onChange={props.handleChange}
                    onBlur={props.handleBlur}
                    name="status"
                    disabled={success || isLoading}
                  >
                    <option value={"public"}>Public</option>
                    <option value={"private"}>Private</option>
                  </Field>
                </div>
              </div>
              <div className="md:flex md:items-center">
                <div className="md:w-1/3"></div>
                <div className="md:w-2/3">
                  <button
                    className="focus:shadow-outline rounded-lg bg-indigo-500 py-2 px-4 font-bold text-white shadow hover:bg-indigo-700 focus:outline-none disabled:opacity-75"
                    disabled={success || isLoading}
                    type="submit"
                  >
                    Create Profile
                  </button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};
