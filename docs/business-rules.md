# RiskLens business rules

## Risk score

Each enabled synthetic rule contributes its configured points once. Scores are
summed and capped at 100. Severity is derived from the final score:

| Severity | Score |
|---|---:|
| LOW | 0-24 |
| MEDIUM | 25-49 |
| HIGH | 50-74 |
| CRITICAL | 75-100 |

| Rule | Points | Trigger |
|---|---:|---|
| R001 High Transaction Amount | 20 | Amount is at least INR 100,000 |
| R002 High Transaction Velocity | 25 | At least 5 transactions in 10 minutes |
| R003 New Device Activity | 20 | Device is marked as new for the event |
| R004 Dormant Account Reactivation | 25 | Dormant period is at least 90 days |
| R005 Circular Fund Transfer | 35 | A circular transfer indicator is present |
| R006 Closed Account Transaction | 100 | Account status is CLOSED |
| R007 Negative Balance Violation | 100 | Post-transaction balance is below the overdraft limit |
| R008 Transfer Reconciliation Failure | 60 | Transfer debit and credit legs differ |

The engine returns every triggered rule, its points, and a reason. `CREATE_ALERT`
is selected for a positive score; otherwise the decision is `NO_ALERT`.

## Synthetic patterns and labels

Baseline transactions are generated first and reconcile exactly against
per-account balances. Transfers contain a source debit and destination credit
of equal amounts. Alert labels are assigned from the generated evidence:
R001 alone is labeled `FALSE_POSITIVE`; R001 plus one or more additional rules
is labeled `SUSPICIOUS`. The separate ground-truth file includes the relevant
rule basis and expected analyst decision.

Known negative scenarios are represented in `exceptions.json` and the ground
truth `knownExceptions` collection rather than corrupting otherwise valid
baseline rows:

- A closed-account transaction is rejected.
- A negative balance without overdraft is flagged.
- A transfer with unequal legs is flagged for reconciliation.
- An alert referencing no transaction is rejected.
- A disposition earlier than the alert is rejected.

These are labelled exception fixtures, not production input rows.

## Cases, dispositions, and history

Alerts are grouped by account into deterministically numbered cases. The
`CaseAlert` bridge permits a case to contain multiple alerts and an alert to be
associated with multiple cases. False-positive alerts receive a deterministic
`DISMISS_ALERT` action. Suspicious HIGH/CRITICAL alerts receive
`ESCALATE_ALERT`; other suspicious alerts remain available for investigation.
Generated analyst actions occur after their alert and are paired with audit
events. Runtime transitions append an `AnalystAction` and `AuditEvent` in the
same database transaction.

Allowed alert transitions are `OPEN -> ESCALATED`, `OPEN -> DISMISSED`, and
`ESCALATED -> DISMISSED`. Cases may be resolved from `OPEN`, `IN_REVIEW`, or
`ESCALATED`, and reopened from `RESOLVED` or `CLOSED`. Notes do not change state.

## Evaluation metrics

The validator predicts `SUSPICIOUS` when any rule other than R001 is present,
then compares that prediction to the separate ground-truth label. It reports
confusion-matrix counts, precision, recall, and false-positive rate. Metrics
are calculated only across planted/labeled alerts and should not be interpreted
as general model performance.
