import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { RegelwerkProvider } from './regelwerk/RegelwerkContext';
import { RegelwerkTor } from './app/RegelwerkTor';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <RegelwerkProvider>
        <RegelwerkTor>
          <App />
        </RegelwerkTor>
      </RegelwerkProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
