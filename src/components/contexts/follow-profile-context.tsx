import { createContext, useContext } from "react";
import type { ButtonContext } from "./button-types";
import { unauthedContext } from "./button-types";

const ProfileContext = createContext<ButtonContext>(unauthedContext);

export const ProfileButtonProvider: React.FC<
  React.PropsWithChildren<{ value: ButtonContext }>
> = ({ value, children }) => {
  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
};

export const useProfileButtonContext = () => useContext(ProfileContext);
