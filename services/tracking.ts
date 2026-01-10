import { API_URL } from '../lib/config';

export const trackActivity = async (
    visitorId: string, 
    type: string, 
    resourceId: string, 
    title: string, 
    duration: number = 0,
    currentName?: string  // <--- This is the new part that fixes the red line!
) => {
    // 1. Prioritize the name passed explicitly (currentName) from the phone
    // 2. If not passed, use 'Guest'
    let displayName = currentName || 'Guest';
    let visitCount = 1;
    let totalTime = 0;

    try {
        const stored = localStorage.getItem('core_connect_profile');
        if (stored) {
            const p = JSON.parse(stored);
            // Double check: Only use stored name if we didn't explicitly pass one
            if (!currentName && p.displayName) displayName = p.displayName;
            
            if (p.visitCount) visitCount = p.visitCount;
            if (p.totalTimeSpent) totalTime = p.totalTimeSpent;
        }
    } catch(e) {}

    try {
        // This sends the data (including the correct name) to the server
        await fetch(`${API_URL}/api/visitor/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                visitorId, 
                displayName, 
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