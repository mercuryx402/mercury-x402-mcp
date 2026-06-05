# mercury-x402-mcp

**17 keyless, signed-provenance web-data tools your AI agent can pay for itself** — over x402 on
Base mainnet (USDC). No Mercury API key, no account, no signup. Your agent calls a tool, it pays the
SKU with *your* wallet, and gets back the result **plus an EIP-191 provenance receipt it can verify
offline, forever.**

Tools include: clean fetch, LLM-ready markdown, structured extract, link graph, robots, diff,
notarize, headers, table extract, feed, availability, validate, batch, sitemap, DNS, readability,
redirect — built **live from Mercury's catalog**, so the list is always current.

## Install

```bash
npx mercury-x402-mcp
```

Add to your MCP host (Claude Desktop / Cursor / Cline / any MCP client):

```json
{
  "mcpServers": {
    "mercury": {
      "command": "npx",
      "args": ["-y", "mercury-x402-mcp"],
      "env": {
        "MERCURY_PRIVATE_KEY": "0xYOUR_BASE_MAINNET_WALLET_KEY"
      }
    }
  }
}
```

`MERCURY_PRIVATE_KEY` is **your** Base-mainnet wallet (funded with a little USDC). Mercury is keyless —
the only thing you bring is a wallet to pay per call. Tools cost ~$0.003–$0.02 each.

The `mercury_catalog` and `mercury_verify` tools work **without** a wallet (free).

## Why

Firecrawl / Jina / Tavily all gate behind a human-created API key + a credit-card plan — an agent
can't onboard itself. Mercury can: an agent discovers the tools, pays over x402, and every result is
cryptographically signed so the bytes are provably genuine and untampered — what RAG, trading, and
agent-to-agent commerce actually need.

Discovery: https://mercury-x402-jed.fly.dev/.well-known/x402 · https://mercury-x402-jed.fly.dev/llms.txt
