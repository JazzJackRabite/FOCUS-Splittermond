import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f2340] flex items-center justify-center p-8">
          <div className="bg-[#1B365D] border-4 border-[#C5A059] rounded-lg p-8 max-w-lg w-full text-center shadow-2xl">
            <h1 className="text-3xl font-bold text-[#C5A059] mb-4 tracking-widest">FOCUS</h1>
            <p className="text-[#f3e5cf] text-lg mb-2 font-bold">Ein unerwarteter Fehler ist aufgetreten.</p>
            {this.state.error && (
              <p className="text-gray-400 text-sm mb-6 font-mono bg-[#0f2340] p-3 rounded border border-[#C5A059] break-words">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-[#C5A059] text-[#1B365D] font-bold px-6 py-2 rounded hover:bg-[#d4b06a] transition-colors"
            >
              Neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
