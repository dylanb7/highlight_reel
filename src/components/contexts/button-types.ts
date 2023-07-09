type ButtonActions = (arg0: any) => void;

type ButtonState = (arg0: any) => {
  follows: boolean;
  pending: boolean;
  disabled: boolean;
};

export type ButtonContext = {
  action: ButtonActions;
  state: ButtonState;
};

const unauthedActions: ButtonActions = () => {
  return;
};

const unauthedState: ButtonState = () => {
  return {
    follows: false,
    pending: false,
    disabled: false,
  };
};

export const unauthedContext: ButtonContext = {
  action: unauthedActions,
  state: unauthedState,
};
