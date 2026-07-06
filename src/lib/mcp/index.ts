import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listOperationsTool from "./tools/list-operations";
import createOperationTool from "./tools/create-operation";

// Direct Supabase host — the .lovable.cloud proxy fails RFC 8414 issuer match.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "miprojet-go-mcp",
  title: "MiProjet Go",
  version: "0.1.0",
  instructions:
    "Tools for MiProjet Go: list and record financial operations for the signed-in user. Use `echo` to verify connectivity.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, listOperationsTool, createOperationTool],
});