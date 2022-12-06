"use client";

import { useState } from "react";

const Tab: React.FC<{
  name: string;
  open: boolean;
  small: boolean;
  setOpen: (arg: string) => void;
}> = ({ name, open, setOpen, small }) => {
  return (
    <li className="-mb-px mr-2 flex-auto text-center last:mr-0">
      <a
        className={
          "block rounded " +
          (small ? "px-3 py-1" : "px-5 py-3") +
          " text-xs font-bold uppercase leading-normal shadow-lg " +
          (open ? "bg-indigo-600 text-white" : "bg-white text-indigo-600")
        }
        onClick={(e) => {
          e.preventDefault();
          setOpen(name);
        }}
        data-toggle="tab"
        href={"/" + name.toLowerCase()}
        role="tablist"
      >
        {name}
      </a>
    </li>
  );
};

export const TabSelect: React.FC<
  React.PropsWithChildren<{
    initial: string;
    tabs: string[];
    small: boolean;
    onChange: (tab: string) => void;
  }>
> = ({ initial, tabs, onChange, children, small }) => {
  const [openTab, setOpenTab] = useState(initial);

  return (
    <div className="flex flex-wrap">
      <div className="w-full">
        <ul
          className="mb-0 flex list-none flex-row flex-wrap pt-3 pb-4"
          role="tablist"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab}
              name={tab}
              open={openTab === tab}
              small={small}
              setOpen={(arg: string) => {
                onChange(arg);
                setOpenTab(arg);
              }}
            />
          ))}
        </ul>
        <div className="z-0 flex w-full min-w-0 flex-col">
          <div className="z-0 flex-auto">
            <div className="tab-content tab-space z-0">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
