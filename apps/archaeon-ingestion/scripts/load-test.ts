import * as crypto from 'crypto';

const API_URL = 'http://localhost:3000/internal/v1/analyze';
const API_KEY = 'test-api-key'; // Change to match your local INTERNAL_API_KEY
const CONCURRENT_REQUESTS = 10;

async function fireRequest(index: number) {
  const jobId = crypto.randomUUID();
  const payload = {
    jobId,
    repository: {
      owner: 'octocat',
      name: 'Hello-World',
      ref: 'main',
      installationId: 12345,
    },
  };

  const startTime = Date.now();

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Api-Key': API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const duration = Date.now() - startTime;
    const data = await res.json().catch(() => null);

    return {
      index,
      status: res.status,
      duration,
      data,
    };
  } catch (error: any) {
    return {
      index,
      status: 'Fetch Error',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function runLoadTest() {
  console.log(
    `Starting load test with ${CONCURRENT_REQUESTS} concurrent requests...`,
  );

  const promises = [];
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    promises.push(fireRequest(i));
  }

  const results = await Promise.all(promises);

  let successCount = 0;
  let tooManyRequestsCount = 0;
  let otherErrorsCount = 0;

  console.log('\n--- Results ---');
  results.forEach((r) => {
    console.log(
      `Request ${r.index.toString().padStart(2, '0')}: Status ${r.status} (${r.duration}ms)`,
    );
    if (r.status === 201) successCount++;
    else if (r.status === 429) tooManyRequestsCount++;
    else otherErrorsCount++;
  });

  console.log('\n--- Summary ---');
  console.log(`Total Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`Success (201): ${successCount}`);
  console.log(`Rate Limited (429): ${tooManyRequestsCount}`);
  console.log(`Other Errors: ${otherErrorsCount}`);

  if (tooManyRequestsCount > 0) {
    console.log(
      '\nLoad test SUCCESS: Concurrency interceptor successfully blocked excess requests.',
    );
  } else {
    console.log(
      '\nLoad test FAILED: Expected some requests to be rate limited (429), but none were.',
    );
  }
}

runLoadTest().catch(console.error);
