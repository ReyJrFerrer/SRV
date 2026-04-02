import { LogLevel, OneSignal } from 'react-native-onesignal';
import Constants from 'expo-constants';

export const setupOneSignal = () => {
  // Get App ID from app config or env
  const onesignalAppId = Constants.expoConfig?.extra?.oneSignalAppId || "YOUR-ONESIGNAL-APP-ID";

  OneSignal.Debug.setLogLevel(LogLevel.Verbose);
  
  // Initialize OneSignal
  OneSignal.initialize(onesignalAppId);
  
  // requestPermission will show the native iOS or Android notification permission prompt.
  // We recommend removing the following code and instead using an In-App Message to prompt for notification permission.
  OneSignal.Notifications.requestPermission(true);

  // Method for listening for notification clicks
  OneSignal.Notifications.addEventListener('click', (event: any) => {
    console.log('OneSignal: notification clicked:', event);
  });
};

export const loginToOneSignal = (externalId: string) => {
  OneSignal.login(externalId);
};

export const logoutFromOneSignal = () => {
  OneSignal.logout();
};