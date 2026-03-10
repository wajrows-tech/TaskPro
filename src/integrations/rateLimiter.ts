// ── Rate Limiter (Token Bucket Algorithm) ──────────────────────────────────
// Ensures we don't exceed third-party API rate limits per integration.

export class RateLimiter {
    private tokens: number;
    private maxTokens: number;
    private refillRateMs: number;
    private lastRefill: number;

    /**
     * @param maxRequestsPerMinute How many requests allowed per minute
     */
    constructor(maxRequestsPerMinute: number) {
        this.maxTokens = maxRequestsPerMinute;
        this.tokens = maxRequestsPerMinute;
        // milliseconds per token added
        this.refillRateMs = (60 * 1000) / maxRequestsPerMinute;
        this.lastRefill = Date.now();
    }

    private refill() {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        const newTokens = Math.floor(timePassed / this.refillRateMs);

        if (newTokens > 0) {
            this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
            this.lastRefill = now;
        }
    }

    /**
     * Consumes 1 token. Returns true if allowed, false if rate limited.
     */
    consume(): boolean {
        this.refill();
        if (this.tokens > 0) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }

    /**
     * Optional async method that blocks until a token is available
     */
    async waitForToken(): Promise<void> {
        while (!this.consume()) {
            await new Promise((resolve) => setTimeout(resolve, this.refillRateMs));
        }
    }
}
 
