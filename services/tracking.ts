import { API_URL } from '../lib/config';

// UPDATED: Added 'currentName' parameter to the end
export const trackActivity = async (
    visitorId: string, 
    type: string, 
    resourceId: string, 
    title: string, 
    duration: number = 0,
    currentName?: string 
) => {
    // 1. Prioritize the explicitly passed name (currentName)
    // 2. Fallback to 'Guest' only if no name is known
    let displayName = currentName || 'Guest';
    let visitCount = 1;
    let totalTime = 0;

    try {
        const stored = localStorage.getItem('core_connect_profile');
        if (stored) {
            const p = JSON.parse(stored);
            
            // If currentName wasn't passed, try to get it from storage
            // But if currentName IS passed, we ignore storage (because storage might be stale)
            if (!currentName && p.displayName) displayName = p.displayName;
            
            if (p.visitCount) visitCount = p.visitCount;
            if (p.totalTimeSpent) totalTime = p.totalTimeSpent;
        }
    } catch(e) {}

    try {
        // The backend uses 'upsert'. If the ID exists, it simply updates the name 
        // to whatever we send here.
        await fetch(`${API_URL}/api/visitor/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                visitorId, 
                displayName, // This forces the database to update the name
                type, 
                resourceId, 
                title, 
                timeSpent: totalTime + duration, 
                visitCount 
            })
        });
    } catch (e) { 
        console.warn("Tracking skipped"); 
    }
};