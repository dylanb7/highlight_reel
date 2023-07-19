type ButtonActions = (arg0: string | number) => void;

type ButtonState = (arg0: string | number) => {
  follows: boolean;
  pending: boolean;
  disabled: boolean;
};

export interface ButtonContext {
  action: ButtonActions;
  state: ButtonState;
}

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
