import * as Sharing from 'expo-sharing';

export const isNativeSharingAvailable = () => Sharing.isAvailableAsync();

export const shareLocalFile = (uri: string, options: { dialogTitle: string; mimeType: string }) =>
  Sharing.shareAsync(uri, options);
