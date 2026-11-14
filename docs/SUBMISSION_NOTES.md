# Submission notes

## Scope and assumptions

- Every generated record is synthetic and uses reserved `.test` email domains.
- Ground-truth labels describe planted generator scenarios, not confirmed fraud.
- Baseline data remains internally consistent; deliberate invalid cases are
  separate labelled fixtures.
- The database is MySQL, with Prisma migrations as the source of relational
  constraints.

## Verification

`npm test` verifies deterministic exports, starter-scale counts, ground-truth
evaluation, and risk-engine behavior without requiring MySQL.
`npm run validate` checks the checked-in generated dataset.
`npm run lint` and `npm run build` check the frontend.
`npm --prefix backend run test:db` checks live database connectivity and
requires a configured `DATABASE_URL`.

## Limitations

The signals and labels are intentionally synthetic and rule-driven. They are
not calibrated on real financial data and must not be used for real customer
decisions. Authentication and role-based authorization are not part of this
demonstration. The audit log is append-only through the analyst workflow, but
database administrators can still alter underlying records.

## Provenance

The source manifest identifies `backend/scripts/generateData.js` as the sole
source. There are no downloaded datasets, external URLs, third-party licenses,
or personal information.
