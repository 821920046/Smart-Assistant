import { useEffect, useRef } from 'react';
import { Memo, NotificationConfig } from '../types.js';
import { useToast } from '../context/ToastContext.js';
import { notificationService } from '../services/notificationService.js';

export const useNotificationScheduler = (
  memos: Memo[],
  updateMemo: (memo: Memo) => void,
  notificationConfig: NotificationConfig
) => {
  const notifiedIds = useRef<Set<string>>(new Set());
  const autoNotifiedIds = useRef<Set<string>>(new Set());
  const { addToast } = useToast();

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = Date.now();
      memos.forEach(memo => {
        // Skip deleted or already completed/archived tasks
        if (memo.isDeleted || memo.isArchived) return;

        // 1. Manual Reminder Logic
        if (memo.reminderAt && now >= memo.reminderAt && !notifiedIds.current.has(memo.id)) {
          notifiedIds.current.add(memo.id);

          const title = "Task Reminder";
          const body = memo.content || memo.title || "You have a task due!";

          notificationService.send(title, body, notificationConfig);

          // Handle repeat logic
          if (memo.reminderRepeat && memo.reminderRepeat !== 'none') {
            const nextTime = memo.reminderAt + (memo.reminderRepeat === 'daily' ? 86400000 : 86400000 * 7);
            updateMemo({ ...memo, reminderAt: nextTime });
            notifiedIds.current.delete(memo.id); // Allow re-notification for the new time
          }
        }

        // 2. Auto-Reminder Logic
        if (notificationConfig.autoReminder.enabled && !memo.reminderAt && !autoNotifiedIds.current.has(memo.id)) {
          const creationAgeMs = now - memo.createdAt;
          const triggerMs = notificationConfig.autoReminder.afterMinutes * 60000;

          if (creationAgeMs >= triggerMs) {
            // Check priority filter
            if (!notificationConfig.autoReminder.priority ||
              memo.priority === notificationConfig.autoReminder.priority ||
              (notificationConfig.autoReminder.priority === 'normal' && memo.priority === 'important')) {

              autoNotifiedIds.current.add(memo.id);
              const title = "Auto-Reminder: Unfinished Task";
              const body = `You created this task ${notificationConfig.autoReminder.afterMinutes} minutes ago: ${memo.title || memo.content}`;

              notificationService.send(title, body, notificationConfig);
              addToast(`Reminder: ${memo.title || 'Task'} is still unfinished`, 'warning');
            }
          }
        }
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [memos, updateMemo, addToast, notificationConfig]);
};
