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
| actionId | String | Yes | `ACT-` + unique token | PK | Immutable, <=30 characters |
| alertId | String | Conditional | Alert ID | No | FK when alert target is present |
| caseId | String | Conditional | Case ID | No | FK when case target is present |
| analystId | String | Yes | Synthetic actor ID | No | Non-empty |
| actionType | Enum | Yes | ESCALATE_ALERT, DISMISS_ALERT, RESOLVE_CASE, REOPEN_CASE, ADD_NOTE | No | Valid target and state transition |
| notes | String | No | Free text | No | Required for ADD_NOTE |
| createdAt | UTC datetime | Yes | Timestamp | No | At/after target creation |

## Relationship bridges and audit events

| Entity | Fields | Keys / validation |
|---|---|---|
| AlertRule | alertId, ruleId, points, reason | Composite PK; FKs to Alert and RiskRule; records each triggered rule |
| CaseAlert | caseId, alertId | Composite PK; FKs to Case and Alert; supports many-to-many |
| AuditEvent | eventId, entityType, entityId, eventType, actorId, details, createdAt | PK; append-only; entityId is a typed polymorphic reference validated against its entity type |

## Exception fixtures

`exceptions.json` is separate from valid baseline entities. Each fixture has a
stable `exceptionId`, an `issue_type`, and an expected outcome. Validation
asserts the fixture arithmetic, missing reference, closed-account reference,
or invalid date ordering. These fixtures never silently corrupt baseline rows.
