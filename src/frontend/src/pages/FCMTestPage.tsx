/**
 * FCM Test Page
 * Visual interface for testing and debugging Firebase Cloud Messaging
 */

import { useState, useEffect } from "react";
import {
  runFCMDiagnostics,
  testNotification,
  clearFCMCache,
  type FCMDiagnostics,
} from "../utils/fcmDebugger";
import fcmService from "../services/fcmService";

export default function FCMTestPage() {
  const [diagnostics, setDiagnostics] = useState<FCMDiagnostics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  useEffect(() => {
    // Load current token on mount
    setCurrentToken(fcmService.getToken());
  }, []);

  const addTestResult = (message: string) => {
    setTestResults((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleRunDiagnostics = async () => {
    setIsLoading(true);
    addTestResult("Running diagnostics...");
    try {
      const result = await runFCMDiagnostics();
      setDiagnostics(result);
      addTestResult("Diagnostics completed successfully");
    } catch (error) {
      addTestResult(`Diagnostics failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    addTestResult("Requesting notification permission...");
    try {
      const permission = await fcmService.requestPermission();
      addTestResult(`Permission result: ${permission}`);
      if (permission === "granted") {
        addTestResult("✅ Permission granted! You can now initialize FCM.");
      } else {
        addTestResult("❌ Permission denied. Please enable notifications in browser settings.");
      }
    } catch (error) {
      addTestResult(`Permission request failed: ${error}`);
    }
  };

  const handleInitializeFCM = async () => {
    addTestResult("Initializing FCM...");
    setIsLoading(true);
    try {
      // Check rate limit first
      const rateLimitRemaining = fcmService.getRateLimitRemaining();
      if (rateLimitRemaining > 0) {
        addTestResult(`⚠️ Rate limited! Wait ${rateLimitRemaining} seconds.`);
        setIsLoading(false);
        return;
      }

      const token = await fcmService.initialize();
      if (token) {
        setCurrentToken(token);
        addTestResult(`✅ FCM initialized successfully!`);
        addTestResult(`Token: ${token.substring(0, 20)}...`);
      } else {
        addTestResult("❌ FCM initialization returned no token");
      }
    } catch (error) {
      addTestResult(`FCM initialization failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterToken = async () => {
    if (!currentToken) {
      addTestResult("❌ No token available. Initialize FCM first.");
      return;
    }

    addTestResult("Registering token with backend...");
    try {
      const success = await fcmService.registerToken(currentToken);
      if (success) {
        addTestResult("✅ Token registered successfully with backend");
      } else {
        addTestResult("❌ Token registration failed");
      }
    } catch (error) {
      addTestResult(`Token registration error: ${error}`);
    }
  };

  const handleTestNotification = async () => {
    addTestResult("Testing notification display...");
    try {
      const success = await testNotification();
      if (success) {
        addTestResult("✅ Test notification displayed");
      } else {
        addTestResult("❌ Test notification failed");
      }
    } catch (error) {
      addTestResult(`Test notification error: ${error}`);
    }
  };

  const handleClearCache = async () => {
    addTestResult("Clearing FCM cache and service workers...");
    try {
      await clearFCMCache();
      setCurrentToken(null);
      setDiagnostics(null);
      addTestResult("✅ Cache cleared. Reload the page to start fresh.");
    } catch (error) {
      addTestResult(`Cache clear error: ${error}`);
    }
  };

  const handleDeleteToken = async () => {
    addTestResult("Deleting FCM token...");
    try {
      const success = await fcmService.deleteToken();
      if (success) {
        setCurrentToken(null);
        addTestResult("✅ Token deleted successfully");
      } else {
        addTestResult("❌ Token deletion failed");
      }
    } catch (error) {
      addTestResult(`Token deletion error: ${error}`);
    }
  };

  const handleClearRateLimit = () => {
    fcmService.clearRateLimit();
    addTestResult("✅ Rate limit cleared manually");
  };

  const getStatusIcon = (value: boolean) => (value ? "✅" : "❌");

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 FCM Test & Debug Tool
          </h1>
          <p className="text-gray-600">
            Comprehensive testing interface for Firebase Cloud Messaging integration
          </p>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={handleRunDiagnostics}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              Run Diagnostics
            </button>
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Request Permission
            </button>
            <button
              onClick={handleInitializeFCM}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              Initialize FCM
            </button>
            <button
              onClick={handleRegisterToken}
              disabled={!currentToken}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
            >
              Register Token
            </button>
            <button
              onClick={handleTestNotification}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Test Notification
            </button>
            <button
              onClick={handleClearRateLimit}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Clear Rate Limit
            </button>
            <button
              onClick={handleDeleteToken}
              disabled={!currentToken}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              Delete Token
            </button>
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Clear All Cache
            </button>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">FCM Ready:</span>
              <span>{getStatusIcon(fcmService.isReady())}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Permission:</span>
              <span className="uppercase">{fcmService.getPermissionStatus()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Rate Limited:</span>
              <span>{fcmService.getRateLimitRemaining() > 0 ? `Yes (${fcmService.getRateLimitRemaining()}s)` : "No"}</span>
            </div>
            {currentToken && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Token:</span>
                <span className="text-sm font-mono truncate max-w-xs">
                  {currentToken.substring(0, 30)}...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Diagnostics Results */}
        {diagnostics && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Diagnostics Report</h2>
            
            {/* Browser Support */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">📱 Browser Support</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between">
                  <span>Notification API:</span>
                  <span>{getStatusIcon(diagnostics.browserSupport.notificationAPI)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Service Worker:</span>
                  <span>{getStatusIcon(diagnostics.browserSupport.serviceWorker)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Push Manager:</span>
                  <span>{getStatusIcon(diagnostics.browserSupport.pushManager)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>FCM Supported:</span>
                  <span>{getStatusIcon(diagnostics.browserSupport.fcmSupported)}</span>
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">⚙️ Configuration</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Firebase Config Valid:</span>
                  <span>{getStatusIcon(diagnostics.configuration.firebaseConfigValid)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>VAPID Key Present:</span>
                  <span>{getStatusIcon(diagnostics.configuration.vapidKeyPresent)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Project ID:</span>
                  <span className="text-sm">{diagnostics.configuration.projectId || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sender ID:</span>
                  <span className="text-sm">{diagnostics.configuration.messagingSenderId || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Service Worker */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">🔧 Service Worker</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Registered:</span>
                  <span>{getStatusIcon(diagnostics.serviceWorker.registered)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active:</span>
                  <span>{getStatusIcon(diagnostics.serviceWorker.active)}</span>
                </div>
                {diagnostics.serviceWorker.scope && (
                  <div className="flex items-center justify-between">
                    <span>Scope:</span>
                    <span className="text-sm truncate max-w-xs">{diagnostics.serviceWorker.scope}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Issues */}
            {diagnostics.issues.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2 text-red-600">❌ Issues Found</h3>
                <ul className="list-disc list-inside space-y-1">
                  {diagnostics.issues.map((issue, i) => (
                    <li key={i} className="text-sm text-red-700">{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {diagnostics.recommendations.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-2 text-blue-600">💡 Recommendations</h3>
                <ul className="list-disc list-inside space-y-1">
                  {diagnostics.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-blue-700">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Test Results Log */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Test Results Log</h2>
            <button
              onClick={() => setTestResults([])}
              className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
            >
              Clear Log
            </button>
          </div>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-gray-500">No test results yet. Run some tests above.</div>
            ) : (
              testResults.map((result, i) => (
                <div key={i} className="mb-1">{result}</div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-lg mb-2">📖 How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li><strong>Run Diagnostics</strong> - Check if your environment is properly configured</li>
            <li><strong>Request Permission</strong> - Ask user for notification permission</li>
            <li><strong>Initialize FCM</strong> - Get FCM token from Firebase</li>
            <li><strong>Register Token</strong> - Save token to backend for push notifications</li>
            <li><strong>Test Notification</strong> - Display a test notification in the browser</li>
            <li><strong>Clear Rate Limit</strong> - Manually clear rate limit cooldown (use after waiting)</li>
            <li><strong>Clear Cache</strong> - Remove all cached data and service workers (requires page reload)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
