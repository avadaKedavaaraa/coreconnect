// services/tracking.ts
import { API_URL } from '../lib/config';

export const trackActivity = async (
    visitorId: string, 
    type: string, 
    resourceId: string, 
    title: string, 
    duration: number = 0,
    currentName?: string  // <--- This allows the name to be passed!
) => {
    let displayName = currentName || 'Guest';
    let visitCount = 1;
    let totalTime = 0;

    try {
        const stored = localStorage.getItem('core_connect_profile');
        if (stored) {
            const p = JSON.parse(stored);
            if (!currentName && p.displayName) displayName = p.displayName;
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