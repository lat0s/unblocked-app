import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { errText } from "./ipc";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 5_000 } },
});

/** A mutation that refreshes the given query keys and toasts its error. */
export function useAction<A, R>(fn: (args: A) => Promise<R>, invalidate: string[], opts?: { success?: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of invalidate) void qc.invalidateQueries({ queryKey: [key] });
      if (opts?.success) toast.success(opts.success);
    },
    onError: (e) => toast.error(errText(e)),
  });
}
