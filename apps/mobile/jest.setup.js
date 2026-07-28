// Jest setup for React Native / Expo
import '@testing-library/react-native';

// Mock expo-sqlite
//
// Respaldado por `node:sqlite` (motor SQLite real de Node, in-memory), no por
// jest.fn() con valores fijos. Así el mock aplica CHECK/UNIQUE constraints,
// datetime('now', ...) y ORDER BY exactamente igual que SQLite real, y los
// tests detectan regresiones reales en outbox.ts / sync-engine.ts en vez de
// pasar por defecto.
//
// Un almacén por nombre de base de datos, vivo mientras dure el registro de
// módulos de Jest (aislado por archivo de test, así que no hay fuga entre
// archivos). closeSync() es un no-op deliberado: expo-sqlite real persiste
// datos en el archivo al reabrir el mismo nombre, y el test de "persistencia"
// depende de ese comportamiento; cerrar de verdad la conexión ':memory:'
// destruiría los datos.
// Nota: babel-plugin-jest-hoist exige que toda variable externa referenciada
// dentro del factory de jest.mock() empiece por "mock" (si no, lanza error en
// tiempo de compilación). Por eso el Map y la función wrapper llevan ese
// prefijo, y el require de node:sqlite va inline en vez de en una constante
// de módulo.
const mockSqliteDatabases = new Map();

function mockWrapSqliteDatabase(realDb) {
  return {
    execSync: (sql) => {
      realDb.exec(sql);
    },
    runSync: (sql, params = []) => {
      const stmt = realDb.prepare(sql);
      return params.length > 0 ? stmt.run(...params) : stmt.run();
    },
    getFirstSync: (sql, params = []) => {
      const stmt = realDb.prepare(sql);
      const row = params.length > 0 ? stmt.get(...params) : stmt.get();
      return row === undefined ? null : row;
    },
    getAllSync: (sql, params = []) => {
      const stmt = realDb.prepare(sql);
      return params.length > 0 ? stmt.all(...params) : stmt.all();
    },
    closeSync: () => {},
  };
}

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn((name) => {
    if (!mockSqliteDatabases.has(name)) {
      const { DatabaseSync } = require('node:sqlite');
      mockSqliteDatabases.set(name, new DatabaseSync(':memory:'));
    }
    return mockWrapSqliteDatabase(mockSqliteDatabases.get(name));
  }),
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
