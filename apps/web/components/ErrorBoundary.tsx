"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-[#050505] text-white/60 gap-6 p-8 text-center">
          <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-3xl">✦</div>
          <h2 className="text-2xl font-serif text-white/80 italic tracking-tight">Something went wrong.</h2>
          <p className="text-xs uppercase tracking-[0.3em] text-white/30 max-w-sm">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-6 py-3 rounded-2xl border border-white/10 text-xs uppercase tracking-widest font-black hover:bg-white/5 transition-all"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
