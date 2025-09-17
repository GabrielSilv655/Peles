import ReactDOM from "react-dom/client";
import App from "./App";
import { LanguageProvider } from './components/LanguageContext';
import { ThemeProvider } from './components/ThemeContext';

import './styles/global.css';

// Log environment info at startup for debugging hosted deployments
console.log('[STARTUP] Frontend iniciado');
console.log('[STARTUP] window.location:', window.location.href);
console.log('[STARTUP] NODE_ENV:', process.env.NODE_ENV);
console.log('[STARTUP] REACT_APP_API_DEVELOPMENT:', process.env.REACT_APP_API_DEVELOPMENT);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
);   
