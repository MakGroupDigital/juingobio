import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.makgroup.juingobio',
  appName: 'JuingoBIO',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2200,
      launchAutoHide: true,
      backgroundColor: '#1A3C34',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
