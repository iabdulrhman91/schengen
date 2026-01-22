import { JsonStorage } from "./json-adapter";
import { IStorage } from "./types";

// Singleton instance
export const storage: IStorage = new JsonStorage();

// Re-export types
export * from './types';
