import { createContext, useContext } from "react";
import type { ButtonContext } from "./button-types";
import { unauthedContext } from "./button-types";

const ReelContext = createContext<ButtonContext>(unauthedContext);

export const ReelButtonProvider: React.FC<
  React.PropsWithChildren<{ value: ButtonContext }>
> = ({ value, children }) => {
  return <ReelContext.Provider value={value}>{children}</ReelContext.Provider>;
};

export const usePoolButtonContext = () => useContext(ReelContext);
