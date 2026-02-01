import React, { useState } from 'react';
import { Icons } from '../../constants';
import { useStore } from '../../services/store';

const SettingsView: React.FC = () => {
  const {
    darkMode, toggleDarkMode, isSyncing, syncError, setSyncSettingsOpen,
    clearHistory, notificationConfig, setNotificationConfig
  } = useStore();

  const [showKey, setShowKey] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Trigger import via store if possible, or keep it here if complex.
      // For now, let's assume we can move it to store if needed.
      // But App.tsx handles the actual logic. 
      // We'll keep the export/import callback logic or move it to actions.
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage your preferences and data</p>
      </div>

      {/* Appearance */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Icons.Sun className="w-5 h-5" />
          Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-200">Dark Mode</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Switch between light and dark themes</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`w-14 h-7 rounded-full p-1 transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
        </div>
      </section>

      {/* Sync */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Icons.Cloud className="w-5 h-5" />
          Sync & Cloud
        </h3>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-200">Cloud Synchronization</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isSyncing ? 'Syncing...' : syncError ? 'Sync Error' : 'Sync Active'}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full ${isSyncing
            ? 'bg-amber-400 animate-pulse'
            : syncError
              ? 'bg-red-500'
              : 'bg-emerald-400'
            }`} />
        </div>
        <button
          onClick={() => setSyncSettingsOpen(true)}
          className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          Configure Sync Settings
        </button>
      </section>

      {/* Notifications */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Icons.Bell className="w-5 h-5" />
          Notifications & Reminders
        </h3>

        <div className="space-y-6">
          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-200">Browser Notifications</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Show desktop alerts in the browser</p>
            </div>
            <button
              onClick={() => setNotificationConfig({
                ...notificationConfig,
                channels: { ...notificationConfig.channels, browser: !notificationConfig.channels.browser }
              })}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${notificationConfig.channels.browser ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${notificationConfig.channels.browser ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* WeNotify */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">WeNotify Edge</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Send to WeNotify engine</p>
              </div>
              <button
                onClick={() => setNotificationConfig({
                  ...notificationConfig,
                  channels: {
                    ...notificationConfig.channels,
                    weNotify: {
                      enabled: !notificationConfig.channels.weNotify?.enabled,
                      endpoint: notificationConfig.channels.weNotify?.endpoint || '',
                      apiKey: notificationConfig.channels.weNotify?.apiKey || ''
                    }
                  }
                })}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${notificationConfig.channels.weNotify?.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${notificationConfig.channels.weNotify?.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            {notificationConfig.channels.weNotify?.enabled && (
              <div className="grid gap-2 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/30">
                <input
                  type="text"
                  placeholder="Endpoint URL"
                  value={notificationConfig.channels.weNotify.endpoint}
                  onChange={(e) => setNotificationConfig({
                    ...notificationConfig,
                    channels: {
                      ...notificationConfig.channels,
                      weNotify: { ...notificationConfig.channels.weNotify!, endpoint: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
                <input
                  type="password"
                  placeholder="API Key (Optional)"
                  value={notificationConfig.channels.weNotify.apiKey}
                  onChange={(e) => setNotificationConfig({
                    ...notificationConfig,
                    channels: {
                      ...notificationConfig.channels,
                      weNotify: { ...notificationConfig.channels.weNotify!, apiKey: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>
            )}
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* WeChat Robot */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">企业微信机器人</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Webhook robot notification</p>
              </div>
              <button
                onClick={() => setNotificationConfig({
                  ...notificationConfig,
                  channels: {
                    ...notificationConfig.channels,
                    wechat: {
                      enabled: !notificationConfig.channels.wechat?.enabled,
                      webhookUrl: notificationConfig.channels.wechat?.webhookUrl || ''
                    }
                  }
                })}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${notificationConfig.channels.wechat?.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${notificationConfig.channels.wechat?.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            {notificationConfig.channels.wechat?.enabled && (
              <div className="pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/30">
                <input
                  type="text"
                  placeholder="Webhook URL"
                  value={notificationConfig.channels.wechat.webhookUrl}
                  onChange={(e) => setNotificationConfig({
                    ...notificationConfig,
                    channels: {
                      ...notificationConfig.channels,
                      wechat: { ...notificationConfig.channels.wechat!, webhookUrl: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>
            )}
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* Email (Resend) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">Email (Resend)</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Notifications via email</p>
              </div>
              <button
                onClick={() => setNotificationConfig({
                  ...notificationConfig,
                  channels: {
                    ...notificationConfig.channels,
                    email: {
                      enabled: !notificationConfig.channels.email?.enabled,
                      apiKey: notificationConfig.channels.email?.apiKey || '',
                      to: notificationConfig.channels.email?.to || ''
                    }
                  }
                })}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${notificationConfig.channels.email?.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${notificationConfig.channels.email?.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            {notificationConfig.channels.email?.enabled && (
              <div className="grid gap-2 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/30">
                <input
                  type="password"
                  placeholder="Resend API Key"
                  value={notificationConfig.channels.email.apiKey}
                  onChange={(e) => setNotificationConfig({
                    ...notificationConfig,
                    channels: {
                      ...notificationConfig.channels,
                      email: { ...notificationConfig.channels.email!, apiKey: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
                <input
                  type="email"
                  placeholder="Recipient Email"
                  value={notificationConfig.channels.email.to}
                  onChange={(e) => setNotificationConfig({
                    ...notificationConfig,
                    channels: {
                      ...notificationConfig.channels,
                      email: { ...notificationConfig.channels.email!, to: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>
            )}
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* Auto Reminder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">Auto Task Reminder</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Remind if a task is not finished</p>
              </div>
              <button
                onClick={() => setNotificationConfig({
                  ...notificationConfig,
                  autoReminder: { ...notificationConfig.autoReminder, enabled: !notificationConfig.autoReminder.enabled }
                })}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${notificationConfig.autoReminder.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${notificationConfig.autoReminder.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            {notificationConfig.autoReminder.enabled && (
              <div className="flex items-center gap-3 pl-4">
                <span className="text-sm text-slate-600 dark:text-slate-400">Remind after</span>
                <input
                  type="number"
                  min="1"
                  value={notificationConfig.autoReminder.afterMinutes}
                  onChange={(e) => setNotificationConfig({
                    ...notificationConfig,
                    autoReminder: { ...notificationConfig.autoReminder, afterMinutes: parseInt(e.target.value) || 1 }
                  })}
                  className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-white"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">minutes</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Data */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Icons.Archive className="w-5 h-5" />
          Data Management
        </h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('app-export'))}
              className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Export Data (JSON)
            </button>
            <button
              onClick={handleImportClick}
              className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Import Data
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleFileChange}
            />
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all history? This cannot be undone.')) {
                  clearHistory();
                }
              }}
              className="text-red-500 hover:text-red-600 text-sm font-medium"
            >
              Clear All Data & History
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
