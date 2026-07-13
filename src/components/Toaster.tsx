import {
  Toaster,
  useToastController,
  useId,
  Toast,
  ToastTitle,
  ToastBody,
} from "@fluentui/react-components";
import { createContext, useCallback, useContext, type ReactNode } from "react";

type Intent = "success" | "error" | "warning" | "info";

interface Ctx {
  show: (input: { title: string; body?: string; intent?: Intent }) => void;
}

const ToastCtx = createContext<Ctx | null>(null);

export function ToasterProvider({ children }: { children: ReactNode }) {
  const toasterId = useId("pulse-toaster");
  const { dispatchToast } = useToastController(toasterId);

  const show = useCallback<Ctx["show"]>(
    ({ title, body, intent = "success" }) => {
      dispatchToast(
        <Toast>
          <ToastTitle>{title}</ToastTitle>
          {body ? <ToastBody>{body}</ToastBody> : null}
        </Toast>,
        { intent, timeout: 3500 },
      );
    },
    [dispatchToast],
  );

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <Toaster toasterId={toasterId} position="bottom-end" />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useToast must be used within ToasterProvider");
  return c;
}
