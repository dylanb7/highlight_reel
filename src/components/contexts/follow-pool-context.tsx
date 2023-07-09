import { createContext, useContext, useMemo } from "react";
import type { PoolInfo } from "../../types/pool-out";
import type { ProfileInfo, ProfilePoolsInfo } from "../../types/user-out";
import { api } from "../../utils/trpc";
import type { ButtonContext } from "./button-types";
import { unauthedContext } from "./button-types";

const PoolContext = createContext<ButtonContext>(unauthedContext);

export const PoolButtonProvider: React.FC<
  React.PropsWithChildren<{ value: ButtonContext }>
> = ({ value, children }) => {
  return <PoolContext.Provider value={value}>{children}</PoolContext.Provider>;
};

export const usePoolButtonContext = () => useContext(PoolContext);
