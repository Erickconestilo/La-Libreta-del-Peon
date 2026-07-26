// Jest setup for React Native / Expo
import '@testing-library/react-native';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    runSync: jest.fn(),
    getFirstSync: jest.fn(),
    getAllSync: jest.fn(),
    closeSync: jest.fn(),
  })),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/',
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

// Mock expo-network
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
    })
  ),
}));

// Mock expo-asset
jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloadAsync: jest.fn(() => Promise.resolve()),
      localUri: null,
    })),
  },
}));
