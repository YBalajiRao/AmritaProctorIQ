import { useState, useEffect } from "react";
import Navbar from "../components/shared/Navbar";
import useSettingsStore from "../stores/useSettingsStore";

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm("Reset all settings to default values?")) {
      resetSettings();
      setLocalSettings(useSettingsStore.getState().settings);
    }
  };

  const totalWeight = localSettings.tabSwitchWeight + localSettings.pasteWeight + localSettings.mouseEntropyWeight + localSettings.keystrokeWeight;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  System Settings
                </h1>
                <p className="text-gray-500 mt-1">Settings are saved to browser and persist across sessions</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleReset} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Reset
                </button>
                <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Save Settings
                </button>
              </div>
            </div>
            {saved && (
              <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Settings saved successfully! Changes will apply to new exam sessions.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Risk Weights */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Risk Scoring Weights</h2>
              <div className="space-y-4">
                {[
                  { key: "tabSwitchWeight", label: "Tab Switching", color: "indigo" },
                  { key: "pasteWeight", label: "Copy-Paste", color: "purple" },
                  { key: "mouseEntropyWeight", label: "Mouse Entropy", color: "pink" },
                  { key: "keystrokeWeight", label: "Keystroke", color: "orange" }
                ].map(({ key, label, color }) => (
                  <div key={key}>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700">{label}</label>
                      <span className={`text-sm font-bold text-${color}-600`}>{localSettings[key]}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={localSettings[key]} onChange={(e) => handleChange(key, parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer" />
                  </div>
                ))}
                <div className={`mt-4 p-3 rounded-lg ${totalWeight === 100 ? "bg-green-50 border-2 border-green-200" : "bg-red-50 border-2 border-red-200"}`}>
                  <p className={`text-sm font-semibold ${totalWeight === 100 ? "text-green-700" : "text-red-700"}`}>
                    Total: {totalWeight}% {totalWeight === 100 ? "✓" : "(Should equal 100%)"}
                  </p>
                </div>
              </div>
            </div>

            {/* Thresholds */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Risk Thresholds</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Low Risk (0 to)</label>
                  <input type="number" min="0" max="100" value={localSettings.lowRiskThreshold} onChange={(e) => handleChange("lowRiskThreshold", parseInt(e.target.value))} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Medium Risk (to)</label>
                  <input type="number" min="0" max="100" value={localSettings.mediumRiskThreshold} onChange={(e) => handleChange("mediumRiskThreshold", parseInt(e.target.value))} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">High Risk (to)</label>
                  <input type="number" min="0" max="100" value={localSettings.highRiskThreshold} onChange={(e) => handleChange("highRiskThreshold", parseInt(e.target.value))} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg" />
                </div>
              </div>
            </div>

            {/* Time Settings */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Time Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Calibration Time (seconds)</label>
                  <input type="number" min="5" max="60" value={localSettings.calibrationTime} onChange={(e) => handleChange("calibrationTime", parseInt(e.target.value))} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Risk Update Interval (seconds)</label>
                  <input type="number" min="1" max="30" value={localSettings.riskUpdateInterval} onChange={(e) => handleChange("riskUpdateInterval", parseInt(e.target.value))} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Exam Duration (seconds)</label>
                  <input type="number" min="60" max="7200" value={localSettings.examDuration} onChange={(e) => handleChange("examDuration", parseInt(e.target.value))} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg" />
                  <p className="text-xs text-gray-500 mt-1">{Math.floor(localSettings.examDuration / 60)} minutes</p>
                </div>
              </div>
            </div>

            {/* Auto Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Automated Actions</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-800">Enable Auto Actions</p>
                    <p className="text-xs text-gray-500">Automatically warn/terminate</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={localSettings.enableAutoActions} onChange={(e) => handleChange("enableAutoActions", e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Auto Warn Threshold</label>
                  <input type="number" min="0" max="100" value={localSettings.autoWarnThreshold} onChange={(e) => handleChange("autoWarnThreshold", parseInt(e.target.value))} disabled={!localSettings.enableAutoActions} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Auto Terminate Threshold</label>
                  <input type="number" min="0" max="100" value={localSettings.autoTerminateThreshold} onChange={(e) => handleChange("autoTerminateThreshold", parseInt(e.target.value))} disabled={!localSettings.enableAutoActions} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg disabled:bg-gray-100" />
                </div>
              </div>
            </div>

            {/* Monitoring Features */}
            <div className="bg-white rounded-xl shadow-lg p-6 col-span-2">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Monitoring Features</h2>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { key: "trackMouseMovement", label: "Mouse Movement", icon: "🖱️" },
                  { key: "trackTabSwitching", label: "Tab Switching", icon: "🔄" },
                  { key: "trackCopyPaste", label: "Copy-Paste", icon: "📋" },
                  { key: "trackKeystroke", label: "Keystroke", icon: "⌨️" },
                  { key: "trackFocus", label: "Focus/Blur", icon: "👁️" }
                ].map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{icon}</span>
                      <span className="font-semibold text-gray-800 text-sm">{label}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={localSettings[key]} onChange={(e) => handleChange(key, e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
