// Firebase 12 exports this in its react-native entry; its browser declarations omit it.
import 'firebase/auth';
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): import('firebase/auth').Persistence;
}
