# Getting Started with MCPBlueprint

MCPBlueprint runs on [Vercel](https://vercel.com). The steps below walk you through the full setup.

---

## Step 1 - Set Environment Variables in Vercel

Before deploying, add all required environment variables in your Vercel project settings.

See [docs/production.md](../docs/production.md) for the full variable list.

---

## Step 2 - Deploy to Vercel

```bash
vercel deploy
```

---

## Step 3 - Open the Admin Panel

Navigate to your Vercel deployment URL. The admin panel is available at the root. From there:
- Toggle agents on or off
- Upload updated agent definitions
- View your risk profile and guardrail alerts
- Check agent status and last activity

See [docs/agent-activation.md](../docs/agent-activation.md) for the recommended activation order.

---

## Step 4 - Test Each Active Agent

Each agent folder contains a `test.md` file. Work through the checklist for every agent you activated before going to production.

```
agents/guardrail/test.md
agents/event-driven/test.md
```

---

## You're Ready

Once testing passes, your MCPBlueprint setup is ready to integrate into your platform. See the `/examples` folder for reference architectures.

---

---

> **Pre-deploy (local, one-time):** Before your first Vercel deploy, you need to generate two config files locally and commit them. You won't repeat these steps during normal operation.
>
> **Generate platform config:**
> ```bash
> git clone https://github.com/mstechdiva-dev/MCPBlueprint.git
> cd MCPBlueprint
> npm install
> node admin-panel/onboarding.js
> ```
> Answers are saved to `config/platform.json`. Commit this file.
>
> **Generate risk profile:**
> ```bash
> node risk-scanner/scanner.js --target /path/to/your/project
> ```
> Output saved to `risk-scanner/output/risk-profile.json`. Review findings, then commit this file. After committing both, proceed with the Vercel deployment steps above.
