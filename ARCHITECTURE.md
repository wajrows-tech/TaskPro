# TaskPro Architecture Principles

> "Place logic in the deepest correct layer of the system. Keep volatile details at the edges and stable meaning in the center."

## 1. The Separation of Concerns (Layered Architecture)

### Layer 1: Persistence (`src/db/`)
*   **Responsibility**: Raw SQL execution, connection pooling, and schema definitions.
*   **Rules**: 
    *   No business logic.
    *   No knowledge of HTTP requests, users, or external events.
    *   Returns raw database rows.

### Layer 2: Domain Services (`src/services/`)
*   **Responsibility**: Core business rules, data validation, orchestration, and event emission.
*   **Rules**:
    *   This is the *stable center*.
    *   Services coordinate multiple DB queries to enforce atomic actions.
    *   Services fire events via the `EventBus`.
    *   Services do *not* know about Express `req` or `res` objects.

### Layer 3: Transport / Controllers (`src/api/routes/`)
*   **Responsibility**: HTTP parsing, payload extraction, and response formatting.
*   **Rules**:
    *   This is a *volatile edge*.
    *   Controllers are "thin". They extract body/params, pass them to a Service, and return the result.
    *   No `db.prepare()` calls are allowed in this layer.

### Layer 4: External Integrations (`src/integrations/`, `src/agents/`)
*   **Responsibility**: Connecting to outside APIs or AI models.
*   **Rules**:
    *   Loosely coupled via the `EventBus`.
    *   Should not cause the core CRM to crash if an external service goes down.

## 2. Explicit State & Data Flow
*   Make illegal states unrepresentable. Use strict TypeScript interfaces (`src/types.ts`).
*   Validate all boundaries before data enters Layer 2 (Domain Services).

## 3. Standardized Error Handling
*   Do not return raw `500 Error: SQL logic error` to the client.
*   Controllers must catch errors and pass them to a centralized Express generic error handler (`next(error)`).
*   Use custom error classes (`ValidationError`, `NotFoundError`) so the handler knows what HTTP code to return (400 vs 404).

## 4. Cohesion and Churn
*   When fixing a bug or adding a feature, leave the file cleaner than you found it. 
*   Shrink oversized files by extracting cohesive logic into utilities or domain concepts.
*   Reuse healthy patterns instead of inventing ad-hoc ones.
