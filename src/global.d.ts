import type { writeTempImage } from './api';

declare global {
  interface Window {
    __writeTempImage?: typeof writeTempImage;
  }
}

export {};
