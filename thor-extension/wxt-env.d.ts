/// <reference types="wxt/client" />
/// <reference types="wxt/browser" />
declare function defineContentScript(definition: {
  matches: string[];
  main: () => void;
}): unknown;
