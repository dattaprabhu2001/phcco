import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// The public site's stylesheet is the original design's, unchanged; admin.css
// only styles the CMS chrome, which the design never had.
import './styles.css';
import './admin/admin.css';

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
