import DashboardLayout from '../../layouts/DashboardLayout';
import { useState, useEffect } from 'react';
import { 
  Settings, 
  Eye, 
  Camera, 
  Shield, 
  Activity, 
  Save,
  RefreshCw
} from 'lucide-react';

export default function ClientSettings() {
  const [settings, setSettings] = useState({
    // Tracking Settings
    captureClicks: true,
    captureInputs: true,
    captureInputChanges: true,
    captureContentEditable: true,
    captureErrors: true,
    capturePerformance: true,
    captureNavigation: true,
    captureForms: true,
    captureFileUploads: true,
    captureScreenshots: true,
    
    // Privacy Settings
    maskSensitiveFields: true,
    respectDNT: false,
    sampleRate: 1.0,
    
    // Performance Settings
    flushIntervalMs: 5000,
    maxBatchSize: 25,
    screenshotIntervalMs: 10000,
    activityHeartbeatMs: 15000,
    inactivityThresholdMs: 30000,
    
    // Screenshot Settings
    screenshotMaxWidth: 2400,
    screenshotQuality: 0.8,
    screenshotFormat: 'webp',
    ocrMode: false
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('extensionSettings');
    if (savedSettings) {
      setSettings(s => ({ ...s, ...JSON.parse(savedSettings) }));
    }
  }, []);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage (in real app, this would be sent to backend)
      localStorage.setItem('extensionSettings', JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      captureClicks: true,
      captureInputs: true,
      captureInputChanges: true,
      captureContentEditable: true,
      captureErrors: true,
      capturePerformance: true,
      captureNavigation: true,
      captureForms: true,
      captureFileUploads: true,
      captureScreenshots: true,
      maskSensitiveFields: true,
      respectDNT: false,
      sampleRate: 1.0,
      flushIntervalMs: 5000,
      maxBatchSize: 25,
      screenshotIntervalMs: 10000,
      activityHeartbeatMs: 15000,
      inactivityThresholdMs: 30000,
      screenshotMaxWidth: 2400,
      screenshotQuality: 0.8,
      screenshotFormat: 'webp',
      ocrMode: false
    });
  };

  return (
    <DashboardLayout variant="client">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Settings size={24} />
          Extension Settings
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Configure your Discovery AI extension behavior and privacy settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Tracking Settings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye size={20} />
            Event Tracking
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Capture Clicks</label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Track user clicks and interactions</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.captureClicks}
                onChange={(e) => handleSettingChange('captureClicks', e.target.checked)}
                className="accent-cyan-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Capture Inputs</label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Track form inputs and text changes</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.captureInputs}
                onChange={(e) => handleSettingChange('captureInputs', e.target.checked)}
                className="accent-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Capture Navigation</label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Track page views and SPA navigation</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.captureNavigation}
                onChange={(e) => handleSettingChange('captureNavigation', e.target.checked)}
                className="accent-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Capture Forms</label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Track form submissions</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.captureForms}
                onChange={(e) => handleSettingChange('captureForms', e.target.checked)}
                className="accent-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Capture Errors</label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Track JavaScript errors</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.captureErrors}
                onChange={(e) => handleSettingChange('captureErrors', e.target.checked)}
                className="accent-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Capture Performance</label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Track performance metrics</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.capturePerformance}
                onChange={(e) => handleSettingChange('capturePerformance', e.target.checked)}
                className="accent-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Screenshot Settings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Camera size={20} />
            Screenshots
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Enable Screenshots</label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Capture periodic screenshots</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.captureScreenshots}
                onChange={(e) => handleSettingChange('captureScreenshots', e.target.checked)}
                className="accent-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <label className="font-medium">Screenshot Interval (ms)</label>
              <input 
                type="number" 
                value={settings.screenshotIntervalMs}
                onChange={(e) => handleSettingChange('screenshotIntervalMs', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                min="1000"
                max="60000"
                step="1000"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How often to capture screenshots (1000-60000ms)
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-medium">Max Width (px)</label>
              <input 
                type="number" 
                value={settings.screenshotMaxWidth}
                onChange={(e) => handleSettingChange('screenshotMaxWidth', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                min="800"
                max="4000"
                step="100"
              />
            </div>

            <div className="space-y-2">
              <label className="font-medium">Quality</label>
              <input 
                type="range" 
                min="0.1"
                max="1"
                step="0.1"
                value={settings.screenshotQuality}
                onChange={(e) => handleSettingChange('screenshotQuality', parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {Math.round(settings.screenshotQuality * 100)}% quality
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-medium">Format</label>
              <select 
                value={settings.screenshotFormat}
                onChange={(e) => handleSettingChange('screenshotFormat', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
              >
                <option value="webp">WebP</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield size={20} />
            Privacy & Security
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Mask Sensitive Fields</label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Automatically redact passwords, emails, etc.</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.maskSensitiveFields}
                onChange={(e) => handleSettingChange('maskSensitiveFields', e.target.checked)}
                className="accent-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Respect Do Not Track</label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Honor browser DNT settings</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.respectDNT}
                onChange={(e) => handleSettingChange('respectDNT', e.target.checked)}
                className="accent-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <label className="font-medium">Sample Rate</label>
              <input 
                type="range" 
                min="0.1"
                max="1"
                step="0.1"
                value={settings.sampleRate}
                onChange={(e) => handleSettingChange('sampleRate', parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {Math.round(settings.sampleRate * 100)}% of sessions tracked
              </p>
            </div>
          </div>
        </div>

        {/* Performance Settings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={20} />
            Performance
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium">Flush Interval (ms)</label>
              <input 
                type="number" 
                value={settings.flushIntervalMs}
                onChange={(e) => handleSettingChange('flushIntervalMs', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                min="1000"
                max="30000"
                step="1000"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How often to send data to server
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-medium">Max Batch Size</label>
              <input 
                type="number" 
                value={settings.maxBatchSize}
                onChange={(e) => handleSettingChange('maxBatchSize', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                min="5"
                max="100"
                step="5"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Maximum events per batch
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-medium">Activity Heartbeat (ms)</label>
              <input 
                type="number" 
                value={settings.activityHeartbeatMs}
                onChange={(e) => handleSettingChange('activityHeartbeatMs', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                min="5000"
                max="60000"
                step="5000"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How often to send heartbeat signals
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-medium">Inactivity Threshold (ms)</label>
              <input 
                type="number" 
                value={settings.inactivityThresholdMs}
                onChange={(e) => handleSettingChange('inactivityThresholdMs', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                min="10000"
                max="300000"
                step="10000"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Time before marking session as inactive
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-blue-600 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        
        <button
          onClick={resetToDefaults}
          className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Reset to Defaults
        </button>
      </div>

      {saved && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
          Settings saved successfully!
        </div>
      )}
    </DashboardLayout>
  );
}
