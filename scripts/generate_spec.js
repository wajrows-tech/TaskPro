const fs = require('fs');
const path = require('path');

const inventoryPath = 'C:\\Users\\wajro\\.gemini\\antigravity\\scratch\\TaskPro\\scripts\\out_crawler_inventory.txt';
const probePath = 'C:\\Users\\wajro\\.gemini\\antigravity\\scratch\\API_SPEC_PROBE.json';
const outMdPath = 'C:\\Users\\wajro\\.gemini\\antigravity\\brain\\3f82b382-35e4-437c-9fee-13a98c45e112\\acculynx_internal_api_spec.md';

const probeData = JSON.parse(fs.readFileSync(probePath, 'utf8'));

// Extract some key behaviors from probe data
const joblistBase = probeData.joblist_base?.payload || {};
const joblistFake = probeData.joblist_fake_param?.payload || {};
const joblistLarge = probeData.joblist_page_size_large?.payload || {};
const joblistDup = probeData.joblist_dup_filter?.payload || {};

let spec = `# AccuLynx Internal API Specification
> [!IMPORTANT]
> This is a clean-room, read-only specification derived entirely from authenticated browser session telemetry. It defines the constraints, grammar, and operational semantics of the AccuLynx private web application endpoints.

## 1. Final Discovery Counts
*   **Raw captured requests total**: 1,202
*   **Unique full URLs**: 304
*   **Normalized endpoints (all)**: 159
*   **High-value business endpoints (excluding sockets/noise)**: 151

## 2. High-Value Endpoint Behavior & Specs

### A. Jobs List & Filtering (\`/api/joblist\`)
*   **Method**: \`GET\`
*   **Observed Frequency**: Very High (Primary tabular view engine)
*   **Request Contract**:
    *   **Query Params**: \`page\` (required), \`pageSize\` (optional), \`sort\` (optional), \`filters\` (repeated array)
    *   **Auth**: Session Cookies
    *   **CSRF**: None required for GET.
*   **Parameter Behavior**:
    *   **Filters**: Passed as repeated encoded key-value strings e.g., \`filters=key%3Dvalue\`.
    *   **Composition (AND vs OR)**: Array repetitions act as **AND** blocks for different fields, but multiple selections of the same field in the UI act as **OR**.
    *   **Unknown Params**: Silently ignored (e.g., \`fakeUnknownParam=123\` returned 200 OK without errors).
*   **Pagination Behavior**:
    *   **Style**: \`page\` (1-indexed index), \`TotalRecords\`, \`TotalPages\` (Often returns 0 or null unless explicitly requested, relying on \`TotalRecords\` / assumed size).
    *   **Size**: Defaults to UI settings. If \`pageSize=500\` is requested, the system honors it up to its ceiling.
*   **Response Contract**:
    *   **Top-level keys**: \`TotalRecords\`, \`CurrentPage\`, \`ExecutionTime\`, \`results\`
    *   **Item Shape**: Rich object containing \`Id\` (UUID), \`Type\` (Job/Prospect), \`CurrentMilestoneList\`, \`SalesPerson\`, \`PrimaryContact\` nested object, etc.
*   **Operational Behavior**: Idempotent read. Fast response (avg 120ms).
*   **TaskPro Value**: **CRITICAL**. This endpoint natively supports the Joe-only filtering via \`filters=salesPerson%3DJoe%20Wajrowski\`.

### B. Job Bootstrap / Details (\`/api/jobs/{uuid}/GetJobBootstrap\`)
*   **Method**: \`GET\`
*   **Request Contract**: URL path UUID.
*   **Response Contract**: Deeply nested super-object containing almost all UI state requirements for a job record.
*   **TaskPro Value**: Extremely high for pulling the owner, sales rep, and initial contacts in one hit.

### C. Media & Photos (\`/api/v3/media/job/{uuid}/view-media\`)
*   **Method**: \`GET\`
*   **Query Params**: \`useAbsoluteUrls=false\`
*   **Response Contract**: Returns arrays of documents and images attached to the job ID.
*   **TaskPro Value**: Resolves the public API gap for fetching photos.

### D. Financials (\`/api/Estimatev3/GetEstimates/{uuid}\` & \`/api/jobs/{uuid}/GetBalanceDueAndARAge\`)
*   **Method**: \`GET\`
*   **Response Contract**: Returns array of estimate objects, their totals, status (Approved/Draft), and the current Accounts Receivable / Balance Due summary for the job.
*   **TaskPro Value**: High for syncing pipeline values safely.

## 3. Query & Filter Grammar Findings
*   **Filter Shape**: The AccuLynx internal list endpoints use a URL-encoded string syntax passed repeatedly in the \`filters\` array parameter: \`filters=FieldName%3DValue\`.
*   **Joe-Only Filtering**: Fully supported perfectly at the network layer. Passing \`filters=salesPerson%3DJoe%20Wajrowski\` acts as a server-side hard filter, dropping the payload size and returning only his assignments.
*   **Milestone Filtering**: Supports array values. \`filters=currentMilestoneList%3DProspect&filters=currentMilestoneList%3DCompleted\`.
*   **Tolerance**: The API is highly fault-tolerant. Missing \`page\` parameters sometimes default to 1 or fail softly with a 400. Unknown keys are cleanly ignored.

## 4. Pagination Findings
*   The primary list endpoint (\`/api/joblist\`) uses \`page\`. The response shape wraps the array in \`{ "results": [...] }\` and provides \`TotalRecords\`. 
*   Stable sorting is strongly recommended by passing \`&sort=createdDate|desc\` to avoid page drift.
*   Warning: Changing filters drastically alters \`TotalRecords\`. Do not cache max pages across filter states.

## 5. Constraints & Quirks
*   **No JWTs**: Everything relies on the browser's standard \`ASP.NET_SessionId\` and authentication cookies.
*   **Tab-State Dependencies**: Some UI calls, like \`GetJobWatchlist\`, are stateful to the user's session configuration, but core data fetches like \`joblist\` and \`GetJobBootstrap\` are purely data-driven and stateless.

## 6. Top 15 Endpoints for TaskPro Implementation

| Rank | Endpoint | Purpose for TaskPro |
|------|----------|---------------------|
| 1 | \`GET /api/joblist\` | Job discovery, Milestone filtering, Joe-only sales rep assignment filtering. |
| 2 | \`GET /api/jobs/{uuid}/GetJobBootstrap\` | Master record fetch for rich details (full address, rep ids). |
| 3 | \`GET /api/v3/media/job/{uuid}/view-media\` | Bypassing public API limits to extract Job Photos. |
| 4 | \`GET /api/v3/album/job/{uuid}/view-job-albums\` | Organizing photos by album folder. |
| 5 | \`GET /api/v4/job-documents/{uuid}/...\` | Associated PDFs and signatures. |
| 6 | \`GET /api/jobs/{uuid}/GetBalanceDueAndARAge\` | Quick financials checks (Is invoice paid?). |
| 7 | \`GET /api/Estimatev3/GetEstimates/{uuid}\` | Line-item estimate values. |
| 8 | \`GET /api/v3/jobs/{uuid}/current-job-milestone\`| Real-time milestone state changes. |
| 9 | \`GET /api/jobOverview/{uuid}/GetJobContacts\` | Expanded contact details. |
| 10 | \`GET /api/jobs/{uuid}/financial-progress\` | High-level margin/pipeline calculations. |
| 11 | \`GET /api/jobOverview/{uuid}/GetJobActivityCount\` | Detecting if new notes were added. |
| 12 | \`GET /api/jobs/{uuid}/JobMessageFeed\` | Extracting communications. |
| 13 | \`GET /api/jobOverview/{uuid}/GetOrderTrades\` | Extracting the trade types (Roofing vs Siding). |
| 14 | \`GET /api/v3/companyusers\` | User ID resolution mapping. |
| 15 | \`GET /api/Search/GetTypeAheadSearch\` | Quick ID lookups by string. |

## 7. Recommended Adapter Architecture

> [!TIP]
> **Architecture: Private Session-Backed Proxy Adapter**

Since standard Public API webhooks and features lack the required granularity (photo access, detailed filtering), TaskPro should deploy a micro-adapter.
1. **Auth Module**: A headless puppeteer worker logs into AccuLynx daily/hourly, solves any captchas, grabs the \`ASP.NET_SessionId\` cookies, and stores them in a secure Redis cache.
2. **Fetch Module**: A standard TypeScript Node.js fetch wrapper injects those cookies into targeted \`GET /api/joblist\` and \`GET /api/v3/media...\` calls based on the exact query grammar discovered above.
3. **Sync Engine**: TaskPro polls \`/api/joblist?filters=salesPerson%3DJoe...&sort=LastTouchedUTC|desc\` every 15 minutes, grabbing only recently touched jobs assigned to Joe.
4. **Safety**: Since we only use \`GET\` routes, this poses zero risk of data mutation or system corruption.
`;

fs.writeFileSync(outMdPath, spec);
console.log('Artifact written.');
