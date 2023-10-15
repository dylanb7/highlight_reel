import { createContext, useContext } from "react";

interface FocusInfo {
  isFocused: boolean;
}

const FocusContext = createContext<FocusInfo>({ isFocused: false });

export const FocusProvider: React.FC<
  React.PropsWithChildren<{ value: FocusInfo }>
> = ({ value, children }) => {
  return (
    <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
  );
};

export const useFocusInfo = () => useContext(FocusContext);
