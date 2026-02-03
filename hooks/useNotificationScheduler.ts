import { useEffect, useRef, useCallback } from 'react';
import { Memo, NotificationConfig } from '../types.js';
import { useToast } from '../context/ToastContext.js';
import { notificationService } from '../services/notificationService.js';

export const useNotificationScheduler = (
  memos: Memo[],
  updateMemo: (memo: Memo) => void,
  notificationConfig: NotificationConfig
) => {
  // Use refs to avoid dependency cycling and interval starvation
  const memosRef = useRef<Memo[]>(memos);
  const configRef = useRef<NotificationConfig>(notificationConfig);
  const updateMemoRef = useRef(updateMemo);

  // Track notified timestamps: memoId -> reminderAt
  // This allows re-triggering if the user updates the reminder time
  const notifiedReminders = useRef<Map<string, number>>(new Map());
  const notifiedAutoIds = useRef<Set<string>>(new Set());

  const { addToast } = useToast();

  // Sync refs with latest props
  useEffect(() => {
    memosRef.current = memos;
    configRef.current = notificationConfig;
    updateMemoRef.current = updateMemo;
  }, [memos, notificationConfig, updateMemo]);

  const checkNotifications = useCallback(() => {
    const now = Date.now();
    const currentMemos = memosRef.current;
    const config = configRef.current;

    currentMemos.forEach(memo => {
      // Skip deleted or archived tasks
      if (memo.isDeleted || memo.isArchived) return;

      // 1. Manual Reminder Logic
      if (memo.reminderAt && now >= memo.reminderAt && !memo.reminded) {
        const lastNotifiedAt = notifiedReminders.current.get(memo.id);

        // Trigger if not notified yet for THIS specific time
        if (lastNotifiedAt !== memo.reminderAt) {
          notifiedReminders.current.set(memo.id, memo.reminderAt);

          const title = "任务提醒";
          const body = memo.content || memo.title || "您有一个到期任务！";

          notificationService.send(title, body, config);

          // Handle repeat logic
          if (memo.reminderRepeat && memo.reminderRepeat !== 'none') {
            const nextTime = memo.reminderAt + (memo.reminderRepeat === 'daily' ? 86400000 : 86400000 * 7);
            updateMemoRef.current({
              ...memo,
              reminderAt: nextTime,
              reminded: false
            });
          } else {
            // For one-time reminders, mark as reminded persistently
            updateMemoRef.current({
              ...memo,
              reminded: true
            });
          }
        }
      }

      // 2. Auto-Reminder Logic
      if (config.autoReminder.enabled && !memo.reminderAt && !notifiedAutoIds.current.has(memo.id)) {
        const creationAgeMs = now - memo.createdAt;
        const triggerMs = config.autoReminder.afterMinutes * 60000;

        if (creationAgeMs >= triggerMs) {
          // Check priority filter
          const minPriority = config.autoReminder.priority || 'normal';
          const priorityLevels: Record<string, number> = { 'secondary': 0, 'normal': 1, 'important': 2 };

          if (priorityLevels[memo.priority as string] >= priorityLevels[minPriority as string]) {
            notifiedAutoIds.current.add(memo.id);
            const title = "自动提醒：未完成任务";
            const body = `该任务已创建 ${config.autoReminder.afterMinutes} 分钟：${memo.title || memo.content}`;

            notificationService.send(title, body, config);
            addToast(`提醒：${memo.title || '任务'} 仍未完成`, 'warning');
          }
        }
      }
    });
  }, [addToast]);

  useEffect(() => {
    // Request permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Run check immediately on mount
    checkNotifications();

    // Set stable interval
    const interval = setInterval(checkNotifications, 5000);

    // Listen for visibility change to catch up on notifications
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkNotifications();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkNotifications);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkNotifications);
    };
  }, [checkNotifications]);
};
