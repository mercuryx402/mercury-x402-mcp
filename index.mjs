#!/usr/bin/env node
// mercury-x402-mcp — exposes Mercury's live x402 services as MCP tools. Each paid tool pays its
// SKU over x402 (Base mainnet, USDC) using the agent's OWN wallet (env MERCURY_PRIVATE_KEY) and
// returns the result + an EIP-191 signed provenance receipt the agent can verify offline.
// Keyless: no Mercury API key, no account. Tools are built LIVE from /catalog so they never go stale.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const BASE = process.env.MERCURY_BASE || "https://mercury-x402-jed.fly.dev";
const KEY = process.env.MERCURY_PRIVATE_KEY; // 0x… Base-mainnet wallet with USDC (the agent pays itself)

// Lazily wrap fetch with x402 payment only if a key is configured (so the catalog/verify tools work
// keyless). Mercury's live server runs the Coinbase x402-express stack (body-native 402 + a server-side
// CDP translator), so the client is the standard Coinbase x402-fetch — proven end-to-end against the
// live storefront (200 + signed receipt + on-chain settle buyer→shop).
let payFetch = null, walletErr = null;
async function getPayFetch() {
  if (payFetch || walletErr) return payFetch;
  try {
    const { wrapFetchWithPayment } = await import("x402-fetch");
    const { privateKeyToAccount } = await import("viem/accounts");
    payFetch = wrapFetchWithPayment(fetch, privateKeyToAccount(KEY));
  } catch (e) { walletErr = String(e?.message || e); }
  return payFetch;
}

const toolName = (slug) => "mercury_" + slug.replace(/^cited-/, "").replace(/^web-/, "").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
const routeOf = (v) => (v.route || "").replace(/^GET\s+/i, "");

async function buildTools() {
  const tools = [], dispatch = {};
  try {
    const cat = await (await fetch(BASE + "/catalog")).json();
    for (const [slug, v] of Object.entries(cat.items || {})) {
      const route = routeOf(v);
      if (!/\/buy\//.test(route) || v.price === "$0") continue;
      const name = toolName(slug);
      dispatch[name] = route;
      tools.push({
        name,
        description: `${(v.description || "").split(/(?<=\.)\s/)[0]} — ${v.price} USDC over x402, keyless, returns a signed provenance receipt.`,
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "Target URL to read." },
            params: { type: "object", description: "Optional extra query params for this SKU." },
          },
          required: ["url"],
        },
      });
    }
  } catch { /* offline catalog — ship just the free tools */ }
  tools.push({ name: "mercury_catalog", description: "List every Mercury service + price (free, no payment).", inputSchema: { type: "object", properties: {} } });
  tools.push({ name: "mercury_verify", description: "Verify a Mercury signed provenance receipt offline (free).", inputSchema: { type: "object", properties: { text: { type: "string" }, attestation: { type: "object" } }, required: ["attestation"] } });
  return { tools, dispatch };
}

const { tools, dispatch } = await buildTools();
const server = new Server({ name: "mercury-x402-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const ok = (t) => ({ content: [{ type: "text", text: typeof t === "string" ? t : JSON.stringify(t, null, 2) }] });
  const err = (t) => ({ content: [{ type: "text", text: t }], isError: true });
  try {
    if (name === "mercury_catalog") return ok((await (await fetch(BASE + "/catalog")).json()).items || {});
    if (name === "mercury_verify") {
      const r = await fetch(BASE + "/x402/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: args.text, attestation: args.attestation }) });
      return ok(await r.json());
    }
    const route = dispatch[name];
    if (!route) return err(`unknown tool: ${name}`);
    if (!KEY) return err("Set MERCURY_PRIVATE_KEY (a Base-mainnet wallet funded with USDC) to call paid Mercury tools. Keyless on Mercury's side — you just need your own wallet to pay.");
    const pf = await getPayFetch();
    if (!pf) return err(`wallet init failed: ${walletErr}`);
    const qs = new URLSearchParams({ url: args.url || "", ...(args.params || {}) }).toString();
    const r = await pf(`${BASE}${route}?${qs}`);
    return ok(await r.text());
  } catch (e) { return err(`Mercury tool error: ${String(e?.message || e)}`); }
});
await server.connect(new StdioServerTransport());
console.error(`[mercury-x402-mcp] ${tools.length} tools ready · ${KEY ? "wallet configured" : "no wallet (set MERCURY_PRIVATE_KEY)"}`);
