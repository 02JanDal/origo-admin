import type { Instrumentation } from "next";

// Node-only logic lives in instrumentation-node.ts so pino is not bundled for the Edge runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNode } = await import("./instrumentation-node");
    registerNode();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { onRequestErrorNode } = await import("./instrumentation-node");
    await onRequestErrorNode(error, request, context);
  }
};
