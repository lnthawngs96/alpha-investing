# Alpha Investing — an agent-native portfolio builder for Bittensor Subnet 88

A portfolio construction tool for Bittensor alpha tokens, built for Subnet 88 (Investing). It exposes its entire workflow as WebMCP tools, so an AI agent and a human can build the same portfolio side by side, on the same screen, at the same time.

Built for the [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/).

## Why this app needs an agent

Subnet 88 scores submitted portfolios, and it penalises copies. Any two portfolios whose L1-normalised allocation vectors sit closer than a Euclidean distance of `0.01` are treated as duplicates, and the one submitted later has its score multiplied down toward zero.

That produces a constrained optimisation problem with an awkward shape:

- allocations must be non-negative (no shorting) and sum to at most 1
- the portfolio must stay far enough from every portfolio you already saved
- but you still want the composition you actually believe in

Before WebMCP, the app could only tell you that you had failed. You would hit save, get `duplicate — distance 0.004`, and then guess your way to a fix by hand.

Now the agent closes that loop. It proposes, measures, adjusts, and re-measures until the portfolio clears the threshold, while you watch every step and keep the final call.

## The core loop

```
generate_portfolio  ->  get_current_portfolio  ->  dedupe.min_distance = 0.004  FAIL
                    ->  escape_dedupe          ->  min_distance = 0.019         PASS
                    ->  save_portfolio
```

Every tool that mutates the portfolio returns the full state back to the agent — validity, total allocation, remaining cash, and current dedupe distance. The agent never has to ask a second time to find out what it just did, which keeps the loop tight enough to converge in a handful of calls.

## Tools

All tools run in the page's own JavaScript, against the same React state the UI renders from. There is no backend and no separate auth.

### Data and navigation

| Tool | Purpose |
| --- | --- |
| `load_subnet_data` | Load an array of subnet rows into the app. Lets the agent fetch data from an external source instead of the user pasting JSON by hand. |
| `get_app_state` | How many subnets are loaded, which fields exist, which tab is open, how many portfolios are saved. |
| `query_subnets` | Rank loaded subnets by any metric and return the top N. |
| `switch_tab` | Move the UI to `table`, `portfolio`, or `saved` so the user sees what the agent is working on. |

### Portfolio construction

| Tool | Purpose |
| --- | --- |
| `generate_portfolio` | Build a portfolio from two criteria groups, merged and deduplicated, weighted by liquidity with a 5% per-subnet cap. |
| `get_current_portfolio` | Full read: allocations, validity, cash, dedupe distance. |
| `set_allocation` | Pin one subnet to a target weight; the rest rescale proportionally. |
| `add_subnets` | Add subnets, funded by taking a fraction of weight from the current largest holdings. |
| `remove_subnets` | Drop subnets and redistribute their weight, either evenly or to named receivers. |
| `escape_dedupe` | Perturb weights with progressively larger amplitude until the portfolio clears the duplicate threshold. Composition is preserved; only weights move. |
| `save_portfolio` | Persist the portfolio. Rejects invalid or duplicate portfolios with a reason the agent can act on. |
| `check_dedupe` | Evaluate any candidate allocation map against saved portfolios without touching the working portfolio. |

## Human and agent on one surface

- **Agent Activity panel** (bottom right) logs every tool call with a plain-language summary and a success or failure marker, so weights never change without a visible cause.
- **Inputs stay in sync.** When the agent picks criteria, the two selector rows update to match — the user sees the reasoning, not just the result.
- **Nothing is destructive.** Every write goes through the existing three-tier store (localStorage, sessionStorage, in-memory context) with history snapshots, so an agent mistake is recoverable from the UI.
- **The agent cannot bypass the rules.** `save_portfolio` runs the same validation and dedupe checks as the save button. An agent that tries to save a duplicate gets the same refusal a human does.

## Running locally

```bash
npm install
npm run dev
```

Paste a JSON array of subnet rows into the Data Input card, or let an agent call `load_subnet_data`. Each row needs at least `netuid`; `name`, `price`, `emission`, `liquidity`, and `price_change_1_day` / `_1_week` / `_1_month` unlock the rest of the features.

## Testing the WebMCP tools

WebMCP requires a secure context, so use `localhost` or an HTTPS deployment.

- **ChatGPT desktop** — open the app in the built-in browser, which supports WebMCP by default.
- **Chrome** — enable `chrome://flags/#enable-webmcp-testing`, then inspect registered tools in DevTools.

The green dot in the Agent Activity panel header confirms WebMCP was detected. A grey dot means the browser has not exposed it.

## Implementation notes

The WebMCP layer lives entirely in `src/webmcp/` and is additive — the app works unchanged in browsers without WebMCP.

- `useWebMCP.js` — feature detection, registration lifecycle, error-to-tool-result conversion. The spec is still moving (the 27 May 2026 draft moved the getter from `Navigator` to `Document`, and Chromium 150 deprecated `navigator.modelContext`), so both surfaces are probed, along with both the `registerTool` and older `provideContext` shapes.
- `useDataTools.js` / `usePortfolioTools.js` — tool definitions, registered by the component that owns the relevant state.
- `portfolioOps.js` — shared allocation maths and the state report returned to the agent.
- `agentLog.js` — external store backing the activity panel.

Two details worth calling out for anyone wiring WebMCP into a React app:

**Tools must not re-register on every render.** Registration is keyed on the tool name list, and `execute` reads live state through a ref. Re-registering on each render leaves a window where a tool briefly does not exist, and an agent call landing in that window fails.

**Tools must outlive the tab.** The portfolio panel stays mounted and is hidden with CSS rather than unmounted, so `generate_portfolio` remains callable while the user is looking at the data table.

## License

MIT — see [LICENSE](./LICENSE).
