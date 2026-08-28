import React, { StrictMode, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Math Fingers Caught Runtime Exception:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('math_finggers_current_user_obj');
    } catch {}
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = window.location.origin + window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] text-slate-100 font-sans">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center text-3xl font-black shadow-inner">
              MF
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                Memuat Ulang Math Fingers
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Terjadi gangguan saat memuat sesi aplikasi. Klik tombol di bawah untuk menyegarkan dan membuka kembali halaman.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-rose-400 text-left overflow-x-auto max-h-24">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition cursor-pointer"
              >
                Muat Ulang Aplikasi
              </button>
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Bersihkan Cache Sesi & Masuk
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Math Fingers PWA ServiceWorker registered successfully: ', registration.scope);
        if ('sync' in registration) {
          (registration as any).sync.register('supabase-sync')
            .then(() => console.log('PWA Background Sync "supabase-sync" registered successfully!'))
            .catch((err: any) => console.warn('PWA Background Sync registration failed:', err));
        }
      })
      .catch((error) => {
        console.error('Math Fingers PWA ServiceWorker registration failed: ', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
