import { RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { describeError, log } from "@/shared/log";
import { captureError } from "@/shared/telemetry";
import { Button } from "@/shared/ui/button";

type Props = { children: ReactNode; scope: string };
type State = { error: Error | null };

/** Contains a crash to one page: it is logged, the rest of the app keeps working. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error);
    log("error", `page "${this.props.scope}" crashed: ${describeError(error)}\ncomponent stack:${info.componentStack ?? ""}`);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid flex-1 place-items-center p-8">
        <div className="max-w-md text-center">
          <h2 className="mb-1 text-base font-semibold">This page hit an error</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {this.state.error.message}. The details were written to the log file (Settings → About).
          </p>
          <Button size="sm" variant="outline" onClick={() => this.setState({ error: null })}>
            <RotateCcw /> Try again
          </Button>
        </div>
      </div>
    );
  }
}
