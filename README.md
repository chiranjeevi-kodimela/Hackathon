# RiskLens

RiskLens is a synthetic transaction-risk review workflow. It ranks activity with
transparent rule points, links alerts to accounts and transactions, groups
related alerts into cases, and preserves analyst decisions and audit events.
It is a demonstration system, not a production fraud decision service.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MySQL 8 (needed for the API, Prisma migrations, and database seed)

## Install and run

From the repository root:

```powershell
npm install
npm install --prefix frontend
npm install --prefix backend
```

Copy `backend/.env.example` to `backend/.env`, then set `DATABASE_URL` to a
MySQL database you control. Generate the Prisma client and apply migrations:

```powershell
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..
```

Start the API and web app in separate terminals:

```powershell
npm run dev:backend
npm run dev
```

The API listens on `http://localhost:5000`. The frontend defaults to
`http://localhost:5000/api`; set `VITE_API_URL` in the frontend environment to
override it. The health endpoint is `http://localhost:5000/api/health`.

## Synthetic data

The generator is deterministic and uses seed `20261022` by default. It writes
JSON, CSV, and MySQL SQL seed files under `backend/data/generated`, a separate
ground-truth file under `backend/data/ground_truth`, and a provenance manifest.
No external or personal data is used.

```powershell
npm run generate:starter
npm run validate
npm run seed
```

The full acceptance scale is 5,000 customers, 7,000 accounts, and 100,000
transactions, with 1,000 alerts:

```powershell
npm run generate:full
npm run validate
npm run seed
```

Both scales use the same generator and relationships. Override its reproducible
seed with `--seed=<integer>` or `RISKLENS_SEED`; select a scale with
`--scale=starter|full` or `RISKLENS_SCALE`. `RISKLENS_DATA_DIR` can direct a
generation/validation run to a separate directory for safe comparisons. The
seed command imports the generated records into an existing database and skips
duplicate primary keys; use a disposable database for a clean baseline.

Ground truth is intentionally excluded from transaction inputs. It records
planted labels and expected decisions. Validation reports counts, key/FK and
lifecycle checks, account-balance and transfer reconciliation, and confusion
matrix metrics derived from those labels. The metrics measure the planted
scenarios only; they are not evidence of real-world fraud performance.

## Tests and checks

```powershell
npm test
npm run lint
npm run build
npm run validate
```

`npm test` uses Node's built-in test runner and has no database requirement. The
database connectivity smoke check is separate: `npm --prefix backend run test:db`.

## Project layout

- `backend/prisma/`: relational schema and migrations
- `backend/scripts/`: deterministic generation, validation, and database seeding
- `backend/src/`: Express API, risk rules, audit and analyst workflows
- `backend/test/`: rule and repeatability tests
- `backend/data/`: synthetic starter data, ground truth, and validation output
- `frontend/src/`: React analyst dashboard
- `docs/`: business rules, entity dictionary, relationships, and submission notes

See [business rules](docs/business-rules.md), [data dictionary](docs/data-dictionary.md),
[entity relationships](docs/er-diagram.md), and
[submission notes](docs/SUBMISSION_NOTES.md) for implementation details.
