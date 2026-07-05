# Archaeon Repository Intelligence Service Runbook

This runbook covers operational procedures for handling incidents and debugging failures in the `repository-intelligence-service`.

## 1. GitHub Rate Limit Exhaustion (403/429)

**Symptom:**
Pipeline logs show: `GitHub Rate Limit Exceeded: GitHub rate limit exceeded. Max retries (3) exhausted.`
The pipeline job ends with `status: 'failed'` and `errorDetails.retryable: true`.

**Cause:**
The service has exceeded the GitHub App Installation rate limit (typically 5,000 requests per hour per installation, though it can vary).

**Action:**

1. **Verify Limit:** The logs will contain the X-RateLimit headers (if available) leading up to the failure.
2. **Backoff:** The service already implements exponential backoff. If it still exhausts the limit, the pipeline is safely halted and marked as retryable.
3. **Retry Strategy:** Django (the caller) is responsible for queuing the job for a retry later. Check the Django Celery queue to ensure it is scheduled with an appropriate delay (e.g., 1 hour) based on `X-RateLimit-Reset`.
4. **Resolution:** Wait for the rate limit window to reset. The job will eventually succeed on retry.

## 2. Sustained OpenAI Timeouts

**Symptom:**
Pipeline logs show multiple warnings/errors for: `OpenAI request timed out after 30000ms`.
The AI extraction phase might fail entirely, leading to `status: 'failed'` with `errorDetails.retryable: false` if all fallback strategies are exhausted.

**Cause:**
The OpenAI API is experiencing degradation, high latency, or complete outages.

**Action:**

1. **Check Status Page:** Verify the OpenAI Status page for ongoing incidents.
2. **Review Metrics:** Look at the structured log `Pipeline Summary` to check if only certain large ADR candidates are timing out, or if all extractions are failing.
3. **Temporary Mitigation:** If only large files are failing, you may need to adjust the extraction prompt or increase `OPENAI_TIMEOUT_MS`. If it's a global outage, pause the Django worker queue that triggers `/analyze` to prevent wasted executions.
4. **Resolution:** Resume the queue once the OpenAI API recovers.

## 3. Debugging a Failed Analysis via Structured Logs

The service emits a structured JSON log at the end of each pipeline run.

**How to Read:**
Look for logs matching `msg: "Pipeline Summary"` in your centralized logging system (e.g., Datadog, Kibana).

**Key Fields:**

- `jobId`: UUID tracing back to the Django repository task.
- `status`: `success`, `partial`, or `failed`.
- `error`: If failed, the high-level reason (e.g., `AI extraction exhausted retries...`).
- `metrics.durationMs`: Total pipeline duration.
- `metrics.tokensUsed`: Number of OpenAI tokens consumed.
- `metrics.decisionsExtracted`: Total successful architectural decisions extracted.

**Deep Dive:**
If a job is `partial` or `failed`, search the logs for `[Job <jobId>]`. The service logs every major state transition:

1. `Creating workspace`
2. `Fetching repository data`
3. `Normalizing repository data`
4. `Partial normalization detected` (if some files failed to parse)
5. `Validating and extracting architecture decisions`
6. `Destroying workspace`

Use these transition logs to pinpoint exactly where the failure occurred.
