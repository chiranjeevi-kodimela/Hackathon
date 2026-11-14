# Data dictionary

All records are synthetic. IDs are immutable, deterministic, and zero-padded.
Money is represented in INR with two decimal places in MySQL and numeric INR
values in JSON. Timestamps are ISO-8601 UTC strings in files and millisecond
UTC `DATETIME` values in MySQL.

## Customer

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| customerId | String | Yes | `CUS-` + 6 digits | PK | Matches `CUS-000001` pattern |
| firstName | String | Yes | Synthetic name | No | 1-80 characters |
| lastName | String | Yes | Synthetic name | No | 1-80 characters |
| email | String | Yes | `.test` domain | Yes | Valid email shape |
| phone | String | Yes | Synthetic phone | No | 1-20 characters |
| kycStatus | Enum | Yes | VERIFIED, PENDING | No | KYC lifecycle value |
| createdAt | UTC datetime | Yes | Timestamp | No | Must not be after account open date |

## Account

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| accountId | String | Yes | `ACC-<customerId>-NN` | PK | Customer ID is a valid parent |
| customerId | String | Yes | Customer ID | No | FK to Customer |
| accountType | Enum | Yes | SAVINGS, CURRENT | No | Declared enum |
| status | Enum | Yes | ACTIVE, DORMANT, CLOSED | No | Declared lifecycle |
| currency | String | Yes | ISO-like code; INR in baseline | No | Three uppercase letters |
| initialBalance | Decimal | Yes | INR | No | Non-negative |
| overdraftLimit | Decimal | Yes | INR | No | Non-negative |
| openedAt | UTC datetime | Yes | Timestamp | No | Not before Customer creation |
| statusSince | UTC datetime | Yes | Timestamp | No | Effective start of current status; at/after openedAt |

## Merchant

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| merchantId | String | Yes | `MER-` + 5 digits | PK | Deterministic format |
| name | String | Yes | Synthetic name | No | 1-120 characters |
| category | String | Yes | GROCERY, FOOD, TRAVEL, ELECTRONICS, HEALTH, RETAIL | No | Known category |
| country | String | Yes | ISO 3166-1 alpha-2; IN in baseline | No | Two uppercase letters |
| status | String | Yes | ACTIVE, INACTIVE, BLOCKED | No | Known lifecycle value |

## Device

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| deviceId | String | Yes | `DEV-` + 5 digits | PK | Deterministic format |
| deviceType | String | Yes | MOBILE, DESKTOP, TABLET | No | Known type |
| operatingSystem | String | Yes | ANDROID, IOS, WINDOWS | No | Non-empty |
| trusted | Boolean | Yes | true/false | No | Boolean |

## Transaction

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| transactionId | String | Yes | `TXN-2026-` + 8 digits | PK | Deterministic format |
| accountId | String | Yes | Account ID | No | FK; no closed-account baseline transaction |
| merchantId | String | Yes | Merchant ID | No | FK to Merchant |
| deviceId | String | Yes | Device ID | No | FK to Device |
| type | Enum | Yes | CREDIT, DEBIT, TRANSFER_IN, TRANSFER_OUT | No | Declared enum |
| amount | Decimal | Yes | INR | No | Positive |
| currency | String | Yes | INR in baseline | No | Matches account currency |
| balanceBefore | Decimal | Yes | INR | No | Equals preceding balance for account |
| balanceAfter | Decimal | Yes | INR | No | Before +/- amount according to type |
| status | String | Yes | COMPLETED in baseline | No | Known transaction state |
| timestamp | UTC datetime | Yes | Timestamp | No | At/after account opening; chronological per account |

## TransferLink (`Transfer`)

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| transferId | String | Yes | `TRF-` + 7 digits | PK | Deterministic format |
| sourceAccountId | String | Yes | Account ID | No | FK; differs from destination |
| destinationAccountId | String | Yes | Account ID | No | FK |
| sourceTransactionId | String | Yes | Transaction ID | Yes | FK to TRANSFER_OUT transaction |
| destinationTransactionId | String | Yes | Transaction ID | Yes | FK to TRANSFER_IN transaction |
| amount | Decimal | Yes | INR | No | Both transaction legs equal this amount |
| status | String | Yes | RECONCILED in baseline | No | Derived from leg comparison |

## RiskRule

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| ruleId | String | Yes | R001-R008 | PK | Must exist in rule catalog |
| name | String | Yes | Human-readable | No | 1-120 characters |
| description | String | Yes | Rule rationale | No | Non-empty |
| points | Integer | Yes | Risk points | No | Positive and stable per rule |
| enabled | Boolean | Yes | true/false | No | Boolean |
| createdAt | UTC datetime | Yes | Timestamp | No | Effective from this time |
| updatedAt | UTC datetime | Yes | Timestamp | No | At/after createdAt |

## Alert

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| alertId | String | Yes | `ALT-2026-` + 6 digits | PK | Deterministic format |
| transactionId | String | Yes | Transaction ID | No | FK to triggering transaction |
| accountId | String | Yes | Account ID | No | FK; equals transaction account |
| riskScore | Integer | Yes | 0-100 | No | Capped sum of triggered rules |
| severity | Enum | Yes | LOW, MEDIUM, HIGH, CRITICAL | No | Derived from score thresholds |
| status | Enum | Yes | OPEN, ESCALATED, DISMISSED, RESOLVED | No | Allowed state transition |
| triggeredRules | JSON | Yes | Rule evidence array | No | Each rule ID/points has an AlertRule FK |
| createdAt | UTC datetime | Yes | Timestamp | No | At/after triggering transaction |

## Case (`RiskCase`)

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| caseId | String | Yes | `CASE-2026-` + 6 digits | PK | Deterministic format |
| title | String | Yes | Synthetic title | No | 1-150 characters |
| description | String | No | Text | No | Optional |
| status | Enum | Yes | OPEN, IN_REVIEW, ESCALATED, RESOLVED, CLOSED | No | Lifecycle; resolvedAt consistent |
| priority | Enum | Yes | Alert severity values | No | Highest linked alert severity |
| assignedTo | String | No | Synthetic analyst ID | No | Optional |
| createdAt | UTC datetime | Yes | Timestamp | No | No earlier than earliest linked alert |
| updatedAt | UTC datetime | Yes | Timestamp | No | At/after createdAt and latest action |
| resolvedAt | UTC datetime | No | Timestamp | No | Present only after resolution |

## AnalystAction

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| actionId | String | Yes | `ACT-2026-` + 6 digits in synthetic exports; `ACT-` + 24 hex characters at runtime | PK | Immutable unique ID |
| alertId | String | Conditional | Alert ID | No | FK when alert target is present |
| caseId | String | Conditional | Case ID | No | FK when case target is present |
| caseAlertCaseId | String | Conditional | Case ID | No | Composite FK to CaseAlert with `caseAlertAlertId` when alert and case are both targeted |
| caseAlertAlertId | String | Conditional | Alert ID | No | Composite FK to CaseAlert with `caseAlertCaseId` when alert and case are both targeted |
| analystId | String | Yes | Synthetic actor ID | No | Non-empty |
| actionType | Enum | Yes | ESCALATE_ALERT, DISMISS_ALERT, RESOLVE_CASE, REOPEN_CASE, ADD_NOTE | No | Valid target and state transition |
| notes | String | No | Free text | No | Required for ADD_NOTE |
| createdAt | UTC datetime | Yes | Timestamp | No | At/after target creation |

## Relationship bridges and audit events

### AlertRule

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| alertId | String | Yes | Alert ID | Composite PK | FK to Alert |
| ruleId | String | Yes | Risk rule ID | Composite PK | FK to RiskRule |
| points | Integer | Yes | Risk points | No | Equals the configured rule points |
| reason | String | Yes | Rule evidence | No | Non-empty explanation of the trigger |

### CaseAlert

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| caseId | String | Yes | Case ID | Composite PK | FK to Case |
| alertId | String | Yes | Alert ID | Composite PK | FK to Alert; bridge row unique per pair |

### AccountStatusEvent

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| eventId | String | Yes | `ASE-2026-` + 6 digits | PK | Immutable event ID |
| accountId | String | Yes | Account ID | No | FK to Account |
| previousStatus | Enum | Yes | ACTIVE, DORMANT, CLOSED | No | Status before transition |
| newStatus | Enum | Yes | ACTIVE, DORMANT, CLOSED | No | Status after transition; valid lifecycle transition |
| reason | String | Yes | DORMANT_REACTIVATION or documented reason | No | Non-empty transition reason |
| previousStatusSince | UTC datetime | Yes | Timestamp | No | Matches the effective start of the prior status |
| effectiveAt | UTC datetime | Yes | Timestamp | No | At/after previousStatusSince; event is append-only |

### AuditEvent

| Field | Type | Req. | Allowed / unit | Unique | Validation |
|---|---|---|---|---|---|
| eventId | String | Yes | `AUD-2026-` + 6 digits in synthetic exports; `AUD-` + 24 hex characters at runtime | PK | Immutable event ID |
| entityType | String | Yes | ALERT, CASE | No | Determines the referenced entity type |
| entityId | String | Yes | ID for entityType | No | Must reference an existing entity of entityType |
| eventType | String | Yes | Recorded state/action name | No | Non-empty; never overwrite prior event |
| actorId | String | Yes | Synthetic analyst/system ID | No | Non-empty |
| details | JSON | No | Event-specific context | No | Valid JSON; may include action/case IDs |
| createdAt | UTC datetime | Yes | Timestamp | No | Event occurrence time |

## Relationships, effective dates, and lifecycle

| Relationship | Cardinality | Optionality / validation |
|---|---|---|
| Customer to Account | 1:N | Every Account has exactly one Customer; a Customer may have no accounts |
| Customer to KYC profile | 1:1 | KYC status is stored on the Customer as its profile; `kycStatus` is required |
| Account to Transaction | 1:N | Every baseline Transaction has one Account; an Account may have no transactions |
| Merchant to Transaction | 1:N | Every generated baseline Transaction references one Merchant |
| Device to Transaction | 1:N | Every generated baseline Transaction references one Device |
| Account to AccountStatusEvent | 1:N | Events are optional and append-only; `effectiveAt` dates the transition |
| Transfer to source/destination Account | N:1 per role | A Transfer has one source and one destination account; they must differ |
| Transfer to source/destination Transaction | 1:1 per leg | Each leg is a unique Transaction FK; the two amounts must reconcile in baseline |
| Alert to Transaction and Account | N:1 each | Every baseline Alert requires one triggering Transaction and its Account |
| Alert to RiskRule | N:M | `AlertRule` is the composite-key bridge; only triggered rules are linked |
| Case to Alert | N:M | `CaseAlert` is the composite-key bridge; groups related alerts |
| AnalystAction to Alert / Case | N:1, optional target | At least one target is required; alert and case may both be present and then must match a CaseAlert bridge |
| AuditEvent to Alert / Case | N:1 polymorphic | `entityType` and `entityId` form the typed reference; events are retained |

Account `statusSince`, status-history `effectiveAt`, transaction `timestamp`,
alert/case/action `createdAt`, and audit `createdAt` are UTC event/effective
times. Baseline transitions and dispositions must be chronological. Cases move
through OPEN, IN_REVIEW, ESCALATED, RESOLVED, or CLOSED; alerts move through
OPEN, ESCALATED, DISMISSED, or RESOLVED. Historical changes are represented by
status events, analyst actions, and audit events rather than destructive
overwrites.

## Exception fixtures

`exceptions.json` and `exceptions.csv` are separate from valid baseline entities
and SQL seed inserts. Each fixture envelope has `exceptionId` (required unique
`EXC-NNN`), `issue_type` (required known scenario), `expectedDecision` and
`expectedOutcome` (required rule-derived labels), `recordIds` (required JSON
object of included entity IDs), and `records` (required JSON object containing
the complete scenario records). Fields inside each nested Customer, Account,
Transaction, Transfer, Alert, Case, and AnalystAction follow the definitions
above. Exception records retain valid parent references wherever possible;
the particular violated relationship or invariant is intentional, identified
by `issue_type`, and kept out of the valid baseline and SQL imports. Ground
truth carries the matching exception ID, type, entity IDs, decision, and
outcome; it is not included in transaction or alert inputs.

The five fixtures cover a rejected transaction on a closed account, a debit
below the no-overdraft limit, non-reconciling transfer legs, an alert with a
missing triggering transaction, and an analyst disposition timestamp earlier
than its alert. The validator checks each underlying record and relationship,
not just the scenario name.
