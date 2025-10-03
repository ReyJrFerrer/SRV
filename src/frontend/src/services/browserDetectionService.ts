import { UAParser } from "ua-parser-js";

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  isDesktop: boolean;
  isMobile: boolean;
  isTablet: boolean;
  os: string;
  osVersion: string;
  supportsPWA: boolean;
  supportsPushNotifications: boolean;
  supportsServiceWorker: boolean;
  supportsWebManifest: boolean;
  isStandalone: boolean;
}

export interface PWACapabilities {
  canInstall: boolean;
  canReceivePushNotifications: boolean;
  installMethod: "beforeinstallprompt" | "manual" | "not-supported";
  pushNotificationMethod: "standard" | "firebase" | "not-supported";
  limitations: string[];
}

class BrowserDetectionService {
  private parser: UAParser;
  private browserInfo: BrowserInfo;

  constructor() {
    this.parser = new UAParser();
    this.browserInfo = this.detectBrowserInfo();
  }

  private detectBrowserInfo(): BrowserInfo {
    const result = this.parser.getResult();
    const browser = result.browser;
    const os = result.os;
    const device = result.device;

    //console.log("🔍 Browser Detection - Raw UA Parser result:", result);

    const isDesktop = device.type === undefined; // Desktop doesn't have device.type
    const isMobile = device.type === "mobile";
    const isTablet = device.type === "tablet";

    // Check for standalone mode (already installed PWA)
    const isStandalone = this.checkStandaloneMode();

    // Check PWA support
    const supportsPWA = this.checkPWASupport();
    const supportsPushNotifications = this.checkPushNotificationSupport();
    const supportsServiceWorker = "serviceWorker" in navigator;
    const supportsWebManifest =
      "onbeforeinstallprompt" in window || isStandalone;

    const info: BrowserInfo = {
      name: browser.name || "Unknown",
      version: browser.version || "Unknown",
      engine: result.engine.name || "Unknown",
      isDesktop,
      isMobile,
      isTablet,
      os: os.name || "Unknown",
      osVersion: os.version || "Unknown",
      supportsPWA,
      supportsPushNotifications,
      supportsServiceWorker,
      supportsWebManifest,
      isStandalone,
    };

    //console.log("🔍 Browser Detection - Processed info:", info);
    return info;
  }

  private checkStandaloneMode(): boolean {
    // Multiple ways to detect standalone mode
    const webkitStandalone = (window.navigator as any).standalone;
    const matchMediaStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const matchMediaMinimalUI = window.matchMedia(
      "(display-mode: minimal-ui)",
    ).matches;

    return !!(webkitStandalone || matchMediaStandalone || matchMediaMinimalUI);
  }

  private checkPWASupport(): boolean {
    const hasServiceWorker = "serviceWorker" in navigator;
    const hasManifest = "onbeforeinstallprompt" in window;
    const isStandalone = this.checkStandaloneMode();

    // Safari on iOS has different PWA support
    const isSafariIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      (window as any).MSStream === undefined;

    return hasServiceWorker && (hasManifest || isStandalone || isSafariIOS);
  }

  private checkPushNotificationSupport(): boolean {
    const hasNotificationAPI = "Notification" in window;
    const hasPushManager = "PushManager" in window;
    const hasServiceWorker = "serviceWorker" in navigator;

    return hasNotificationAPI && hasPushManager && hasServiceWorker;
  }

  getBrowserInfo(): BrowserInfo {
    return this.browserInfo;
  }

  getPWACapabilities(): PWACapabilities {
    const info = this.browserInfo;
    const limitations: string[] = [];

    //console.log("🔍 Analyzing PWA capabilities for:", info.name, info.version);

    // Analyze installation capabilities
    let canInstall = false;
    let installMethod: PWACapabilities["installMethod"] = "not-supported";

    if (info.isStandalone) {
      canInstall = false; // Already installed
      installMethod = "manual";
    } else if (info.supportsWebManifest && !this.isSafari()) {
      canInstall = true;
      installMethod = "beforeinstallprompt";
    } else if (this.isSafariDesktop() || this.isSafariMobile()) {
      canInstall = true;
      installMethod = "manual";
      limitations.push("Safari requires manual installation via Share menu");
    } else if (info.supportsPWA) {
      canInstall = true;
      installMethod = "manual";
      limitations.push("Browser requires manual installation");
    }

    // Analyze push notification capabilities
    let canReceivePushNotifications = false;
    let pushNotificationMethod: PWACapabilities["pushNotificationMethod"] =
      "not-supported";

    if (info.supportsPushNotifications) {
      if (this.isSafari()) {
        // Safari has limited push notification support
        if (this.isSafariVersion16Plus()) {
          canReceivePushNotifications = true;
          pushNotificationMethod = "standard";
        } else {
          limitations.push(
            "Safari requires version 16+ for web push notifications",
          );
        }
      } else if (this.isFirefox()) {
        canReceivePushNotifications = true;
        pushNotificationMethod = "standard";
      } else {
        canReceivePushNotifications = true;
        pushNotificationMethod = "firebase";
      }
    } else {
      limitations.push("Browser does not support push notifications");
    }

    // Browser-specific limitations
    if (this.isBrave()) {
      limitations.push(
        "Brave may block push notifications - ensure notifications are enabled in browser settings",
      );
    }

    if (info.isMobile && this.isChrome()) {
      limitations.push(
        "Chrome mobile may require user gesture for installation",
      );
    }

    if (this.isEdge()) {
      if (!info.supportsWebManifest) {
        limitations.push("Edge may require enabling PWA features in settings");
      }
    }

    const capabilities: PWACapabilities = {
      canInstall,
      canReceivePushNotifications,
      installMethod,
      pushNotificationMethod,
      limitations,
    };

    //console.log("🔍 PWA Capabilities:", capabilities);
    return capabilities;
  }

  // Browser detection helpers
  private isSafari(): boolean {
    return this.browserInfo.name.toLowerCase().includes("safari");
  }

  private isSafariDesktop(): boolean {
    return this.isSafari() && this.browserInfo.isDesktop;
  }

  private isSafariMobile(): boolean {
    return (
      this.isSafari() &&
      (this.browserInfo.isMobile || this.browserInfo.isTablet)
    );
  }

  private isChrome(): boolean {
    return this.browserInfo.name.toLowerCase().includes("chrome");
  }

  private isBrave(): boolean {
    return (navigator as any).brave !== undefined;
  }

  private isFirefox(): boolean {
    return this.browserInfo.name.toLowerCase().includes("firefox");
  }

  private isEdge(): boolean {
    return this.browserInfo.name.toLowerCase().includes("edge");
  }

  private isSafariVersion16Plus(): boolean {
    if (!this.isSafari()) return false;
    const version = parseFloat(this.browserInfo.version);
    return version >= 16;
  }

  // Logging helper for debugging
  logBrowserCapabilities(): void {
    // const info = this.browserInfo;
    const capabilities = this.getPWACapabilities();

    //console.group("🔍 Browser Detection & PWA Capabilities");
    //console.log("Browser:", `${info.name} ${info.version}`);
    //console.log("Engine:", info.engine);
    //console.log("OS:", `${info.os} ${info.osVersion}`);
    //console.log("Device:", {
    //   isDesktop: info.isDesktop,
    //   isMobile: info.isMobile,
    //   isTablet: info.isTablet,
    // });
    // console.log("PWA Support:", {
    //   supportsPWA: info.supportsPWA,
    //   supportsPushNotifications: info.supportsPushNotifications,
    //   supportsServiceWorker: info.supportsServiceWorker,
    //   supportsWebManifest: info.supportsWebManifest,
    //   isStandalone: info.isStandalone,
    // });
    //console.log("Capabilities:", capabilities);

    if (capabilities.limitations.length > 0) {
      //console.warn("Limitations:", capabilities.limitations);
    }
    //console.groupEnd();
  }
}

// Export singleton instance
export const browserDetectionService = new BrowserDetectionService();
export default browserDetectionService;
