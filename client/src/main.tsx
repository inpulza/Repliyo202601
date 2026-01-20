import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log('🚀 [main.tsx] App starting...');
createRoot(document.getElementById("root")!).render(<App />);
console.log('🚀 [main.tsx] App rendered');
