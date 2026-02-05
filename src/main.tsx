 import { createRoot } from "react-dom/client";
 import App from "./App.tsx";
 import "./index.css";
 import { addSecurityMetaTags } from "@/lib/security";
 
 // Add security meta tags on app load
 addSecurityMetaTags();
 
 // Register service worker for PWA
 if ("serviceWorker" in navigator) {
   window.addEventListener("load", () => {
     navigator.serviceWorker.register("/sw.js").catch(() => {
       // Service worker registration failed - this is normal in development
     });
   });
 }
 
 createRoot(document.getElementById("root")!).render(<App />);
