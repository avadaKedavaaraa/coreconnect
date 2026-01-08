
import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { NotificationService } from '../services/NotificationService';
import { Lineage } from '../types';

interface NotificationRequestProps {
    lineage: Lineage;
    onClose: () => void;
    onEnable: () => void;
    onDisable: () => void;
}

export default function NotificationRequest({ lineage, onClose, onEnable, onDisable }: NotificationRequestProps) {
    const isWizard = lineage === Lineage.WIZARD;
    const [permission, setPermission] = useState(Notification.permission);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Show if permission is default (not asked yet)
        if (Notification.permission === 'default') {
            const hasSeen = sessionStorage.getItem('seen_notif_request');
            if (!hasSeen) {
                setTimeout(() => setVisible(true), 3000); // Delay showing
            }
        }
    }, []);

    const handleEnable = async () => {
        const result = await NotificationService.subscribeUser();
        if (result.success) {
            setPermission('granted');
            localStorage.setItem('core_connect_notifications', 'true');
            onEnable();
            setVisible(false);
        } else {
            alert("Failed to enable notifications. Check permissions.");
        }
    };

    const handleDismiss = () => {
        setVisible(false);
        sessionStorage.setItem('seen_notif_request', 'true');
        onClose();
    };

    if (!visible || permission === 'granted' || permission === 'denied') return null;

    return (
        <div className={`fixed bottom-4 right-4 z-[100] max-w-sm p-4 rounded-xl border shadow-2xl flex flex-col gap-3 animate-[fade-in-up_0.5s]
            ${isWizard ? 'bg-[#0a0f0a] border-emerald-500/50' : 'bg-[#0f0a15] border-fuchsia-500/50'}
        `}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${isWizard ? 'bg-emerald-900/50 text-emerald-400' : 'bg-fuchsia-900/50 text-fuchsia-400'}`}>
                        <Bell size={20} />
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>
                            {isWizard ? "Owl Post Service" : "System Alerts"}
                        </h4>
                        <p className={`text-xs opacity-70 ${isWizard ? 'text-emerald-200' : 'text-fuchsia-200'}`}>
                            {isWizard ? "Receive scrolls instantly when they arrive." : "Get push notifications for new announcements."}
                        </p>
                    </div>
                </div>
                <button onClick={handleDismiss} className={`opacity-50 hover:opacity-100 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`}>
                    <X size={16} />
                </button>
            </div>
            
            <div className="flex gap-2 mt-1">
                <button 
                    onClick={handleEnable}
                    className={`flex-1 py-2 rounded text-xs font-bold transition-all
                        ${isWizard ? 'bg-emerald-600 text-black hover:bg-emerald-500' : 'bg-fuchsia-600 text-black hover:bg-fuchsia-500'}
                    `}
                >
                    ENABLE
                </button>
                <button 
                    onClick={handleDismiss}
                    className={`flex-1 py-2 rounded text-xs font-bold border transition-all hover:bg-white/5
                        ${isWizard ? 'border-emerald-800 text-emerald-400' : 'border-fuchsia-800 text-fuchsia-400'}
                    `}
                >
                    LATER
                </button>
            </div>
        </div>
    );
}
