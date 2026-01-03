
// ---------------------------------------------------------------------------
// CORE CONNECT SERVER ENTRY POINT
// ---------------------------------------------------------------------------
// NOTE: You might notice this file is small. That is INTENTIONAL.
// 
// The actual application logic (AI, Database, Admin Routes) has been moved 
// to "../api/index.js".
//
// WHY?
// We do this to share the exact same code between:
// 1. This local server (npm start)
// 2. The Netlify Cloud Functions (deployment)
//
// This prevents code duplication and ensures your live site works exactly
// like your local version.
// ---------------------------------------------------------------------------

import app from '../api/index.js';

const PORT = process.env.PORT || 3001;

// Only listen if this file is run directly (not imported by Netlify)
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
    app.listen(PORT, () => {
        console.log(`✅ CoreConnect Server running on port ${PORT}`);
        console.log(`🧠 Logic loaded from api/index.js (Full Features Active)`);
    });
}

export default app;
