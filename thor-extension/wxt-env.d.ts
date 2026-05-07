/// <reference types="wxt/client" />
/// <reference types="wxt/browser" />

declare function defineContentScript<T extends { matches: string[]; main: () => void }>(definition: T): T;
