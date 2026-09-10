"""Print a Markdown comparison of saved k6 legacy summary exports."""

import json
from pathlib import Path


print('| Run | Workload requests | p95 ms | p99 ms | HTTP error % | Application error % | Dropped |')
print('| --- | ---: | ---: | ---: | ---: | ---: | ---: |')
for path in sorted((Path(__file__).parent / 'results').glob('*.summary.json')):
    metrics = json.loads(path.read_text(encoding='utf-8-sig'))['metrics']
    duration = metrics.get('http_req_duration{phase:workload}', {})
    count = metrics.get('http_reqs{phase:workload}', {}).get('count', 0)
    if not count:
        # Older runs before the explicit workload-count threshold was added.
        checks = metrics.get('checks', {})
        count = checks.get('passes', 0) + checks.get('fails', 0)
    if not count:
        print(f'| {path.stem} | 0 | N/A | N/A | N/A | N/A | N/A |')
        continue
    error = metrics.get('http_req_failed{phase:workload}', {}).get('value', 0) * 100
    business = metrics.get('business_errors', {}).get('value', 0) * 100
    dropped = metrics.get('dropped_iterations', {}).get('count', 0)
    print(f'| {path.stem} | {count} | {duration.get("p(95)", 0):.0f} | '
          f'{duration.get("p(99)", 0):.0f} | {error:.2f} | {business:.2f} | {dropped} |')
