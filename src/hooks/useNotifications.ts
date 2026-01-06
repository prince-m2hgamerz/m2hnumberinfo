import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 
  | "order_success" 
  | "order_fail" 
  | "order_create" 
  | "credit_add" 
  | "credit_deduct" 
  | "profile_update" 
  | "admin_message";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// Sound frequencies for different notification types
const soundConfigs: Record<NotificationType, { frequencies: number[]; duration: number }> = {
  order_success: { frequencies: [523, 659, 784], duration: 150 },
  order_fail: { frequencies: [300, 250, 200], duration: 200 },
  order_create: { frequencies: [440, 550], duration: 100 },
  credit_add: { frequencies: [523, 659, 784, 1047], duration: 120 },
  credit_deduct: { frequencies: [400, 350], duration: 150 },
  profile_update: { frequencies: [500, 600], duration: 100 },
  admin_message: { frequencies: [600, 800, 600], duration: 150 },
};

export const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load notifications from localStorage
  useEffect(() => {
    if (!userId) return;
    
    const stored = localStorage.getItem(`notifications_${userId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Notification[];
        setNotifications(parsed);
        setUnreadCount(parsed.filter(n => !n.read).length);
      } catch (e) {
        console.error("Failed to parse notifications:", e);
      }
    }
  }, [userId]);

  // Save notifications to localStorage
  const saveNotifications = useCallback((notifs: Notification[]) => {
    if (!userId) return;
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifs.slice(0, 50))); // Keep last 50
    setNotifications(notifs);
    setUnreadCount(notifs.filter(n => !n.read).length);
  }, [userId]);

  // Play notification sound
  const playSound = useCallback((type: NotificationType) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const config = soundConfigs[type];
      const now = ctx.currentTime;

      config.frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = type === 'order_fail' || type === 'credit_deduct' ? 'sawtooth' : 'sine';
        oscillator.frequency.value = freq;

        const startTime = now + (index * config.duration) / 1000;
        const endTime = startTime + config.duration / 1000;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, endTime);

        oscillator.start(startTime);
        oscillator.stop(endTime + 0.1);
      });
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  }, []);

  // Add a new notification
  const addNotification = useCallback((
    type: NotificationType,
    title: string,
    message: string,
    playNotificationSound = true
  ) => {
    const newNotification: Notification = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      read: false,
      created_at: new Date().toISOString(),
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 50);
      if (userId) {
        localStorage.setItem(`notifications_${userId}`, JSON.stringify(updated));
      }
      setUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });

    if (playNotificationSound) {
      playSound(type);
    }

    return newNotification;
  }, [userId, playSound]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    saveNotifications([]);
  }, [saveNotifications]);

  // Subscribe to help_requests for admin messages
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('admin-messages')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'help_requests',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.admin_reply && newData.status === 'resolved') {
            addNotification(
              'admin_message',
              'Admin Reply',
              `You received a reply on "${newData.subject}"`
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, addNotification]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    playSound,
  };
};
