import ReactDOM from "react-dom/client";
import App from "./App";
import { LanguageProvider } from './components/LanguageContext';
import { ThemeProvider } from './components/ThemeContext';

import './styles/global.css';

// Logs de inicialização removidos para evitar poluição do console

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
);   
