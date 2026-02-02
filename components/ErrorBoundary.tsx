
import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children?: React.ReactNode;
  viewKey?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.viewKey !== prevProps.viewKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in zoom-in duration-300">
          <div className="p-4 bg-rose-500/10 rounded-full mb-6 border border-rose-500/20">
            <AlertTriangle size={48} className="text-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs mx-auto text-sm leading-relaxed">
            We encountered an unexpected error while loading this section.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
            <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
                <RefreshCcw size={16} /> Try Again
            </button>
            <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-all active:scale-95"
            >
                Reload App
            </button>
          </div>

          {this.state.error && (
             <div className="mt-8 w-full max-w-sm">
                 <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">Error Details</p>
                 <pre className="p-4 bg-slate-100 dark:bg-black/30 rounded-xl text-[10px] text-slate-500 font-mono text-left overflow-auto max-h-32 border border-slate-200 dark:border-white/5 whitespace-pre-wrap">
                     {this.state.error.toString()}
                 </pre>
             </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
