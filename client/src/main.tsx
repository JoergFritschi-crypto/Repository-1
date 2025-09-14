import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n"; // Initialize i18n

// Suppress ResizeObserver loop errors - these are harmless browser warnings
if (typeof window !== 'undefined') {
  const errorHandler = (e: ErrorEvent) => {
    if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  };
  
  window.addEventListener('error', errorHandler);
  
  // Also suppress the same error in ResizeObserver itself
  const resizeObserverErr = window.ResizeObserver;
  window.ResizeObserver = class ResizeObserver extends resizeObserverErr {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        requestAnimationFrame(() => {
          callback(entries, observer);
        });
      });
    }
  };
}

createRoot(document.getElementById("root")!).render(<App />);
