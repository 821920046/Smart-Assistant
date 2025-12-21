import { useEffect, useRef } from 'react';
import { Memo } from '../types.js';
import { useToast } from '../context/ToastContext.js';

export const useNotificationScheduler = (memos: Memo[], updateMemo: (memo: Memo) => void) => {
  const notifiedIds = useRef<Set<string>>(new Set());
  const { addToast } = useToast();

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = Date.now();
      memos.forEach(memo => {
        if (memo.reminderAt && now >= memo.reminderAt && !notifiedIds.current.has(memo.id)) {
          notifiedIds.current.add(memo.id);

          if (Notification.permission === "granted") {
            try {
              new Notification("Task Reminder", {
                body: memo.content || "You have a task due!",
                icon: '/favicon.ico'
              });
            } catch (e) {
              console.warn("Notification failed to display", e);
            }
          } else {
            // Fallback to toast instead of alert
            addToast(`Reminder: ${memo.content}`, 'info');
          }

          // Handle repeat logic
          if (memo.reminderRepeat && memo.reminderRepeat !== 'none') {
            const nextTime = memo.reminderAt + (memo.reminderRepeat === 'daily' ? 86400000 : 86400000 * 7);
            updateMemo({ ...memo, reminderAt: nextTime });
            notifiedIds.current.delete(memo.id); // Allow re-notification for the new time
          }
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [memos, updateMemo, addToast]);
};
