import { API_URL } from '../lib/config';

export const trackActivity = async (
    visitorId: string, 
    type: string, 
    resourceId: string, 
    title: string, 
    duration: number = 0,
    currentName?: string 
) => {
    // 1. Start with the passed name, or default to 'Guest'
    let displayName = currentName || 'Guest';
    let visitCount = 1;
    let totalTime = 0;

    try {
        const stored = localStorage.getItem('core_connect_profile');
        if (stored) {
            const p = JSON.parse(stored);
            
            // --- FIX IS HERE ---
            // If we don't have a name, OR if the name is just "Guest", 
            // try to find a real name in storage.
            if ((!currentName || currentName === 'Guest') && p.displayName && p.displayName !== 'Guest') {
                displayName = p.displayName;
            }
            // -------------------

            if (p.visitCount) visitCount = p.visitCount;
            if (p.totalTimeSpent) totalTime = p.totalTimeSpent;
        }
    } catch(e) {}

    try {
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