import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initButtonClickSound } from './utils/soundUtils';

// Initialize gentle button click sound feedback
initButtonClickSound();

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
