import { Component, ErrorInfo, ReactNode } from "react";
import FallbackError from "./FallbackError";

// Detect chunk/dynamic-import failures caused by stale file references
// after a new deployment deletes old hashed chunks.
function isChunkLoadError(error: Error): boolean {
  const msg = error.message ?? "";
  return (
    error.name === "ChunkLoadError" ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Unable to preload CSS")
  );
}

const CHUNK_RELOAD_KEY = "_chunk_reload_at";
const RELOAD_COOLDOWN_MS = 30_000; // prevent infinite reload loops

function shouldReload(): boolean {
  const last = sessionStorage.getItem(CHUNK_RELOAD_KEY);
  if (!last) return true;
  return Date.now() - Number(last) > RELOAD_COOLDOWN_MS;
}

function markReload() {
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
}

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  reloading: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, reloading: false };

  public static getDerivedStateFromError(error: Error): State {
    if (isChunkLoadError(error) && shouldReload()) {
      markReload();
      // Reload asynchronously - getDerivedStateFromError must be synchronous
      setTimeout(() => window.location.reload(), 0);
      return { hasError: false, reloading: true };
    }
    return { hasError: true, error, reloading: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!isChunkLoadError(error)) {
      console.error("Uncaught error:", error, errorInfo);
    }
  }

  public resetErrorBoundary = () => {
    this.setState({ hasError: false, error: undefined, reloading: false });
  };

  public render() {
    if (this.state.reloading) {
      // Blank screen for the instant before the reload fires
      return null;
    }

    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <FallbackError
            error={this.state.error}
            resetErrorBoundary={this.resetErrorBoundary}
          />
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
