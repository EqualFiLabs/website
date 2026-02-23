export interface ToastOptions {
  title: string;
  description?: string;
  type?: "pending" | "success" | "error" | "info";
  link?: string;
}

export interface ToastContextValue {
  addToast: (options: ToastOptions) => string;
  removeToast: (id: string) => void;
}

export const useToasts: () => ToastContextValue;

const ToastProvider: ({ children }: { children: React.ReactNode }) => JSX.Element;
export default ToastProvider;
