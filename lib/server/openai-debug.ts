export type OpenAIDebugRoute = "/api/generate" | "/api/critique";

export type OpenAIDebug = {
  called: boolean;
  responseId: string | null;
  model: string | null;
  usage: unknown | null;
  hasApiKey: boolean;
  route: OpenAIDebugRoute;
};

export function createOpenAIDebug(route: OpenAIDebugRoute, hasApiKey: boolean): OpenAIDebug {
  return {
    called: false,
    responseId: null,
    model: null,
    usage: null,
    hasApiKey,
    route,
  };
}
