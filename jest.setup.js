// Jest setup file

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock notifications module
jest.mock('./lib/notifications', () => ({
  syncNotifications: jest.fn(() => Promise.resolve()),
  rescheduleAllReminders: jest.fn(() => Promise.resolve()),
}));
