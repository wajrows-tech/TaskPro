import { useState, useCallback, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../AuthContext';

export function useSync() {
    const { user } = useAuth();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);

    // Track online/offline status
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            flushQueue();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Listen for Service Worker background sync triggers
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'FLUSH_SYNC_QUEUE') {
                flushQueue();
            }
        };
        navigator.serviceWorker?.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            navigator.serviceWorker?.removeEventListener('message', handleMessage);
        };
    }, [user]);

    // Local storage queue simply to track count on UI, actual data is in IndexedDB or Backend
    const updatePendingCount = useCallback(async () => {
        if (!user) return;
        try {
            // In a real app we'd query IndexedDB. Here we just ask the backend for our queue size
            // since this is a hybrid approach. If offline, we can't ask the backend.
            if (isOnline) {
                const res = await fetch('/api/sync/pending', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPendingCount(data.items?.length || 0);
                }
            }
        } catch (e) {
            console.error('Failed to get pending sync count', e);
        }
    }, [user, isOnline]);

    useEffect(() => {
        updatePendingCount();
    }, [updatePendingCount]);

    const flushQueue = useCallback(async () => {
        if (!isOnline || !user) return;

        try {
            console.log('[Sync] Flushing offline mutation queue...');
            await fetch('/api/sync/flush', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            await updatePendingCount();
        } catch (e) {
            console.error('[Sync] Flush failed', e);
        }
    }, [isOnline, user, updatePendingCount]);

    // Used by components to wrapper their mutations
    const mutate = useCallback(async (
        entityType: string,
        action: 'create' | 'update' | 'delete',
        payload: any,
        entityId?: number
    ) => {
        // Optimistic UI updates happen in the component.
        // We just drop the payload in the queue.
        try {
            await fetch('/api/sync/enqueue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    entityType,
                    action,
                    payload,
                    entityId
                })
            });
            await updatePendingCount();

            // If online, try to flush immediately
            if (isOnline) {
                flushQueue();
            } else if ('serviceWorker' in navigator && 'SyncManager' in window) {
                // Register for background sync when connection is restored
                const registration = await navigator.serviceWorker.ready;
                // @ts-ignore - TS doesn't fully know about Background Sync API yet
                await registration.sync.register('sync-mutations');
            }

        } catch (e) {
            console.error('[Sync] Failed to enqueue mutation', e);
            throw e;
        }
    }, [isOnline, flushQueue, updatePendingCount]);

    return {
        isOnline,
        pendingCount,
        mutate,
        flushQueue
    };
}
 
 
