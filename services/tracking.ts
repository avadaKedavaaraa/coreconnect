import { API_URL } from '../lib/config';

export const trackActivity = async (
    visitorId: string, 
    type: string, 
    resourceId: string, 
    title: string
) => {
    // 1. Name Recovery Logic (Jo tumne likha tha)
    let displayName = 'Guest';
    let visitCount = 1;

    try {
        const stored = localStorage.getItem('core_connect_profile');
        if (stored) {
            const p = JSON.parse(stored);
            if (p.displayName && p.displayName !== 'Guest') {
                displayName = p.displayName;
            }
            if (p.visitCount) visitCount = p.visitCount;
        }
    } catch(e) {}

    // 2. Server Call (No Duration, No Math)
    try {
        await fetch(`${API_URL}/api/visitor/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                visitorId, 
                displayName, 
                type,        // e.g., "VIEW_PDF"
                resourceId, 
                title, 
                timeSpent: 0, // Hum duration track nahi kar rahe
                visitCount 
            })
        });
    } catch (e) { 
        console.warn("Tracking skipped"); 
    }
};