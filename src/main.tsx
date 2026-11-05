import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { RegelwerkProvider } from './regelwerk/RegelwerkContext';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <RegelwerkProvider>
        <App />
      </RegelwerkProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
