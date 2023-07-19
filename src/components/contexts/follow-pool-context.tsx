import { createContext, useContext, } from "react";
import type { ButtonContext } from "./button-types";
import { unauthedContext } from "./button-types";

const PoolContext = createContext<ButtonContext>(unauthedContext);

export const PoolButtonProvider: React.FC<
  React.PropsWithChildren<{ value: ButtonContext }>
> = ({ value, children }) => {
  return <PoolContext.Provider value={value}>{children}</PoolContext.Provider>;
};

export const usePoolButtonContext = () => useContext(PoolContext);
