declare function defineContentScript(config: {
  matches: string[];
  main: () => void;
}): unknown;
