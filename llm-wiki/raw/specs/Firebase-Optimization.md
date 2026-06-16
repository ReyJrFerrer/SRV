#Firebase-Optimization.md
**Role:** AI Coding Agent / Developer Assistant  
**Target Environment:** Google Cloud Platform (GCP) -> Firebase Cloud Functions Gen 2 (Backed by Cloud Run), Node.js environment.

## 1. System Context & Objective

Your primary objective when generating, refactoring, or reviewing Firebase Functions is to maximize resource efficiency, minimize cold starts, and aggressively prevent Cloud Run CPU quota exhaustion (429 errors). Always write serverless code assuming highly variable traffic and deployment scale. For large codebases, optimize not only runtime behavior, but also deployment strategy so that function count and revision churn do not repeatedly exhaust quotas.[1][2]

## 2. Core Architectural Directives

### 2.1 Concurrency Over Instance Proliferation

- **Rule:** ALWAYS configure Gen 2 functions to handle concurrent requests unless the function relies on strictly isolated state.
- **Implementation:** Set the `concurrency` option explicitly. This allows a single instance to serve multiple requests, drastically reducing the number of container spin-ups and conserving total CPU allocation.
- **Standard:** `concurrency: 80` (or an appropriate maximum based on memory constraints).

### 2.2 Right-Sizing Resource Allocation

- **Rule:** Do NOT use default memory/CPU limits blindly. Default to the absolute minimum viable resources.
- **Implementation:** Map memory to CPU appropriately. For basic CRUD operations or lightweight webhooks, specify `memory: "256MiB"` unless profiling proves a higher tier is required.
- **Standard:** Reserve higher specs (`1GiB`+) ONLY for functions doing active memory processing, image manipulation, or large dataset iterations.

### 2.3 Connection Management (Crucial)

- **Rule:** Database connections (MongoDB, Cloud SQL, Firebase Admin) MUST be pooled and managed globally.
- **Implementation:** Initialize connections OUTSIDE the function execution scope to ensure they are reused across warm invocations.
- **Standard:** Implement connection state checks within the handler to ensure the global connection is still alive before executing queries.

### 2.4 Consolidation Over Fragmentation

- **Rule:** Do NOT create a separate deployed function for every tiny variation of business logic. Overly fragmented deployments increase operational overhead, deployment pressure, and quota risk for large Firebase projects.[3][2]
- **Implementation:** Consolidate related behaviors behind shared entrypoints when the auth model, resource profile, and domain boundary are the same. A small number of well-structured HTTP or callable functions is often better than dozens of near-identical wrappers.[3][4]
- **Standard:** Group by bounded context, such as `admin`, `billing`, `notifications`, `user-profile`, or `internal-jobs`, and route internally to service-layer handlers instead of exporting a new top-level function for every minor operation.

### 2.5 Deployment Scalability As A First-Class Concern

- **Rule:** Treat deployment throughput as an architecture concern. If the project contains many functions, full-project deploys must be avoided by default because Firebase documents quota issues for large deployments and recommends partial deploys.[1][2]
- **Implementation:** Design code ownership and folder layout so changed functions can be identified and deployed independently.
- **Standard:** Use codebase grouping, module boundaries, and CI metadata to support selective deployment instead of redeploying the entire fleet.

## 3. Code-Level Optimization Rules

### 3.1 Global State & Lazy Initialization

- **DO:** Declare heavy dependencies, SDK clients, and configuration variables in the global scope when they are shared by most requests for that function.
- **DO NOT:** Initialize the `firebase-admin` app or establish database connections inside the `onRequest` or `onCall` handler unless isolation is required.
- **Lazy Loading:** For functions with multiple conditional paths, dynamically import heavy modules only inside the path that requires them to reduce cold start execution time.

### 3.2 Asynchronous Execution & Termination

- **Rule:** Always resolve, reject, or return the HTTP response properly.
- **DO NOT:** Leave hanging promises or background tasks running after the HTTP response has been sent, as CPU gets throttled after the response in standard Cloud Run configurations.
- **Standard:** Use `Promise.all()` for parallel execution of independent tasks rather than awaiting sequentially.

### 3.3 Thin Transport Layer, Shared Service Layer

- **Rule:** Exported Firebase functions must be thin wrappers. Business logic belongs in reusable service modules.
- **Implementation:** Split code into layers: transport (`onRequest`, `onCall`, triggers), domain services, repositories/data access, and utilities.
- **Standard:** The exported function should mainly perform auth validation, request parsing, runtime config application, and response formatting. Core business logic should be invoked from a shared service method so multiple routes can reuse the same implementation.

## 4. Deployment Optimization Rules

### 4.1 Partial Deploys Only For Large Projects

- **Rule:** In projects with a high function count, NEVER default to `firebase deploy --only functions` for routine changes. Firebase supports partial deploys, and large all-at-once deployments are more likely to hit quota limits.[1][5][6]
- **Implementation:** Deploy only the functions that changed, for example:

```bash
firebase deploy --only functions:switchUserRole
firebase deploy --only functions:userSync,functions:sendPushNotification
```

- **Standard:** All local developer workflows and CI pipelines must support deploying an explicit subset of functions.

### 4.2 Batched CI/CD Deployments

- **Rule:** CI/CD must batch deployments when many functions changed. Do not send hundreds of function updates in one command if the project is already quota-sensitive.[2][7]
- **Implementation:** Detect changed functions from git diff, map files to exported function names, and deploy in small batches such as 5 to 20 functions per job depending on stability.
- **Standard:** If the changed set exceeds the safe batch size, split into sequential deploy steps with retries and visibility into failed batches.

### 4.3 Change-Based Deploy Selection

- **Rule:** CI/CD must be aware of which functions are affected by a code change.
- **Implementation:** Maintain a deterministic mapping between folders/modules and exported functions. A change under `src/functions/admin/` should deploy only the admin-related exports unless a shared dependency invalidates a wider set.
- **Standard:** Shared modules such as `src/services/permissions.ts` must declare their dependent exported functions in deployment metadata or a manifest so CI can expand the changed set safely.

### 4.4 Safe Full Deploy Conditions

- **Rule:** Full deploys are reserved for exceptional cases only.
- **Allowed Cases:** initial environment bootstrapping, major runtime upgrades, wide shared-library changes with no reliable dependency map, or manual maintenance windows.
- **Standard:** If a full deploy is unavoidable, perform it during low-traffic windows and monitor quota utilization during the release.

## 5. Consolidation Strategy

### 5.1 When To Consolidate

Consolidate functions when all of the following are true:

- The functions share the same authentication model.
- The functions touch the same domain or resource family.
- The functions have similar memory and timeout requirements.
- The only difference is a small branch of business logic or action type.

Examples:

- Replace separate callable functions like `approveUser`, `suspendUser`, and `switchUserRole` with a single `adminUserAction` callable function that validates an action enum and dispatches internally.
- Replace many micro HTTP endpoints under the same resource family with a domain router such as `/admin/users/:action` or `/billing/webhook/:provider`.

### 5.2 When NOT To Consolidate

Do NOT consolidate when:

- One path is CPU-heavy and another is lightweight.
- One path needs a different security boundary or service account.
- One path needs a different scaling policy, timeout, region, or memory tier.
- Consolidation would create an unreadable god-function.

### 5.3 Recommended Structure

```text
functions/
  src/
    handlers/
      admin/
        adminUserAction.ts
        adminReports.ts
      billing/
        billingWebhook.ts
      notifications/
        notificationDispatch.ts
    services/
      admin/
        userRoleService.ts
        userModerationService.ts
      billing/
        stripeService.ts
      notifications/
        pushService.ts
    repositories/
      userRepo.ts
      auditRepo.ts
    index.ts
```

```ts
// index.ts
export { adminUserAction } from "./handlers/admin/adminUserAction";
export { billingWebhook } from "./handlers/billing/billingWebhook";
export { notificationDispatch } from "./handlers/notifications/notificationDispatch";
```

This structure keeps exported functions limited and intentional while preserving modular internals.[3][8]

## 6. CI/CD Blueprint For Changed Functions Only

### 6.1 Pipeline Requirements

Every CI/CD pipeline for Firebase Functions must:

1. Detect changed files from the target branch.
2. Resolve those files to affected exported functions.
3. Exclude unaffected functions from the deploy.
4. Deploy affected functions in batches.
5. Fail loudly when dependency mapping is ambiguous.

### 6.2 Minimal Strategy

Use a manifest file that maps source folders to exported functions.

```json
{
  "src/handlers/admin": ["adminUserAction", "adminReports"],
  "src/handlers/billing": ["billingWebhook"],
  "src/handlers/notifications": ["notificationDispatch"],
  "src/services/admin": ["adminUserAction", "adminReports"],
  "src/services/billing": ["billingWebhook"],
  "src/services/notifications": ["notificationDispatch"]
}
```

### 6.3 CI/CD Pseudocode

```bash
CHANGED_FILES=$(git diff --name-only origin/main...HEAD)
AFFECTED_FUNCTIONS=$(node scripts/resolve-affected-functions.js "$CHANGED_FILES")

# Batch size can be tuned
BATCH_SIZE=10

node scripts/deploy-function-batches.js "$AFFECTED_FUNCTIONS" "$BATCH_SIZE"
```

### 6.4 Deployment Script Behavior

The deployment script must:

- deduplicate function names,
- sort them deterministically,
- chunk them into batches,
- run `firebase deploy --only functions:nameA,functions:nameB`,
- retry transient quota failures with backoff,
- stop on permanent failures.

### 6.5 GitHub Actions Example

```yaml
name: Deploy Changed Firebase Functions

on:
  push:
    branches:
      - main

jobs:
  deploy-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm --prefix functions ci

      - name: Resolve affected functions
        run: node functions/scripts/resolve-affected-functions.js > affected.txt

      - name: Deploy affected batches
        run: node functions/scripts/deploy-function-batches.js affected.txt 10
```

## 7. Anti-Patterns (Strictly Prohibited)

1. **Infinite Scaling:** Deploying functions without `maxInstances`. Always cap `maxInstances` to protect the GCP quota and budget.
2. **Zombie Connections:** Opening a new database connection inside the handler and failing to use a pool.
3. **Over-provisioning:** Using 1-2 vCPUs for a simple authentication or state toggle function.
4. **Synchronous Loops:** Using blocking synchronous operations for external I/O or heavy computation.
5. **Function Sprawl:** Exporting a new deployed function for every tiny behavior instead of grouping related actions under a coherent domain boundary.
6. **Blind Full Deploys:** Redeploying the entire functions fleet for minor changes in a quota-sensitive project.[1][2]
7. **Unmapped Shared Dependencies:** Changing shared service code without a deployment manifest or dependency map, causing stale runtime behavior in undeployed functions.

## 8. Agent Implementation Template (Gen 2)

When generating new HTTP functions, strictly adhere to this structural pattern:

```javascript
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { routeAdminAction } = require("./services/admin/routeAdminAction");

if (!admin.apps.length) {
  admin.initializeApp();
}

let dbConnection = null;

exports.adminUserAction = onRequest(
  {
    memory: "256MiB",
    concurrency: 80,
    maxInstances: 50,
    region: "asia-southeast1",
  },
  async (req, res) => {
    try {
      if (!dbConnection) {
        dbConnection = await establishDatabaseConnection();
      }

      const result = await routeAdminAction({
        action: req.body?.action,
        data: req.body,
        db: dbConnection,
      });

      res.status(200).json(result);
    } catch (error) {
      console.error("Function Execution Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);
```

## 9. Agent Directives For Future Code Generation

- Prefer fewer, better-designed exported functions over many shallow wrappers.
- Keep exported functions transport-focused and push logic into services.
- Generate deployment metadata or manifests whenever new folders or shared modules are introduced.
- When modifying shared code, identify all dependent exported functions and mark them for deploy.
- When generating CI/CD workflows, default to changed-function deploys with batching and retries.
- Never assume full deploys are acceptable in a project with high function count or known quota pressure.
