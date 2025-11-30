import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const containerEl = document.getElementById('root');
if (containerEl) {
  const root = createRoot(containerEl);
  root.render(<App />);
}