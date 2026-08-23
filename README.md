# BUDGY

An open-source personal expense manager for tracking expenses, income, transfers, budgets, accounts, cards, and debts. BUDGY supports natural-language entry, such as “₹450 lunch at Cafe today”, so logging a transaction stays quick.

## Features

- Track expenses, income, and transfers across multiple accounts.
- Organize spending with categories, budgets, recurring transactions, and rules.
- Monitor credit-card cycles, balances, debts, and monthly spending insights.
- Add transactions with a fast local parser and optional LLM-assisted natural-language entry.
- Sign in securely with Supabase email/password auth and keep each user's data isolated with Row Level Security.
- Install the app as a PWA and queue quick-add entries while offline.
- Run scheduled jobs for recurring transactions and budget/card reminders when deployed on Vercel.

## Built with

Next.js, React, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL/Supabase, and Vercel Cron.

## Use BUDGY yourself

To run your own copy, follow the complete [setup guide](./SETUP.md). It covers creating a Supabase project, environment variables, database migrations, local development, deployment, cron jobs, and PWA installation.

The short version:

```bash
git clone <your-fork-or-repository-url>
cd BUDGY-final
npm install
cp .env.example .env.local
npm run dev
```

You will need to configure `.env.local` and run the Supabase migrations before the app can be used. See [SETUP.md](./SETUP.md) for the required values and exact steps.

## Development

```bash
npm run dev        # start the local development server
npm run build      # create a production build
npm run lint       # run ESLint
npm test           # run unit tests
npm run test:e2e   # run Playwright end-to-end tests
```

## Contributing

Contributions, bug reports, and feature ideas are welcome. Please open an issue to discuss substantial changes before submitting a pull request.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
