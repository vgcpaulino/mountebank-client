---
name: mountebank-faults
description: Test how code handles slow, failing or flaky dependencies with mountebank-client. Covers fixed delays (wait), deterministic failure sequences for retry tests, random errors and latency with the chaos behavior, catching unmocked calls with a default response, and proxying to a real backend (proxyResponse, proxy modes) with added latency or faults. Use when writing tests for timeouts, retries, circuit breakers, error handling, or when putting mountebank in front of a real service.
---

# Faults, latency and proxies

Pick the most deterministic tool that tests what you need. Tests that assert exact outcomes should not depend on
randomness.

| Goal                                         | Tool                                            |
| -------------------------------------------- | ----------------------------------------------- |
| Client times out                             | `wait` longer than the client's timeout         |
| Client retries N times, then succeeds        | `multipleResponses` with `repeat`               |
| Client handles a specific error              | a stub with that `status`                       |
| Behaviour under random errors / latency      | `chaos`                                         |
| Calls that nobody mocked fail loudly         | `addDefaultResponse`                            |
| Real backend, but slower or flakier          | `proxyResponse` plus `wait` / `chaos`           |

## Fixed delay

```ts
new StubBuilder({ imposterPort }).get('/slow').response({ status: 200, body: { ok: true }, wait: 3000 });
```

`wait` is in milliseconds and applies to every response from that entry.

## Deterministic retries

```ts
new StubBuilder({ imposterPort })
    .get('/flaky')
    .multipleResponses([
        { status: 503, body: { error: 'unavailable' }, repeat: 2 }, // calls 1 and 2
        { status: 200, body: { ok: true }, repeat: 1000 },          // every call after
    ]);
```

After the last entry mountebank starts again from the first one, so give the final entry a large `repeat` if it must
stick for the rest of the test.

## Random faults: `chaos`

HTTP/HTTPS only. Works on any mountebank version, as long as the server allows injection (`allowInjection`, the
default for `startMountebank`, or `mb --allowInjection`): by default the builder implements chaos as a generated
`decorate` function.

```ts
new StubBuilder({ imposterPort })
    .get('/orders')
    .response({
        status: 200,
        body: [],
        chaos: {
            errorRate: 0.2,    // 20% of responses are replaced by an error (0 to 1, default 0)
            errorStatus: 503,  // status of the injected error (default 500)
            latencyRate: 0.5,  // 50% of responses get a random delay (0 to 1, default 0)
            maxLatency: 2000,  // delay is random between 0 and this many ms (default 1000)
        },
    });
```

- An injected error has an empty body, **unless the imposter has a default response**: then mountebank fills the
  empty body (and missing headers) from the default response. Don't assert that error bodies are empty.
- Error and latency are independent: a response can be both delayed and replaced.
- The builder validates the values and throws on a rate outside 0..1 or a negative / non-integer status or latency.
- `chaos` is applied after every other behavior, so an injected error replaces whatever `decorate` or `copyFrom*`
  produced.
- `implementation: 'native'` uses mountebank's own `chaos` behavior instead, which doesn't need injection but needs
  mountebank **2.9.6+** (not released yet; older servers reject it with `Unrecognized behavior: "chaos"`). Both
  behave the same. Use it only when you know the server is new enough and injection is off.
- Because it's random, don't assert exact counts. Use it for exploratory runs and soak tests, or assert properties
  that must always hold ("never shows a blank page", "eventually succeeds"). Use `errorRate: 1` when a test needs
  every call to fail.

## Make unmocked calls fail loudly

```ts
new ImposterBuilder({ port: imposterPort, protocol: 'http' })
    .addDefaultResponse({ status: 599, body: { error: 'no stub matched this request' } });
```

A distinctive status makes a missing stub obvious in the test failure instead of a confusing empty `200`.

## Proxying to a real backend

```ts
new StubBuilder({ imposterPort })
    .get('/api', { operator: 'startsWith' })
    .proxyResponse({ url: 'https://staging.example.com', proxyMode: 'proxyAlways' });
```

| `proxyMode`          | Behaviour                                                                           |
| -------------------- | ----------------------------------------------------------------------------------- |
| `proxyAlways` (default) | Always forwards; records every response as a new stub behind the proxy.           |
| `proxyOnce`          | Forwards the first matching request, then replays the recorded response.           |
| `proxyTransparent`   | Always forwards, records nothing.                                                   |

- `url` is the backend's origin; the request path is appended to it.
- Recorded stubs keep the backend's real response time as a `wait` (the client always enables mountebank's
  `addWaitBehavior`), so replays are as slow as the original.
- Add faults on top of the real backend with the same options as `response()`:

  ```ts
  .proxyResponse({ url: 'https://staging.example.com', wait: 500, chaos: { latencyRate: 1, maxLatency: 1500 } })
  ```

  Random latency per request is a quick way to make responses arrive out of order and expose race conditions in a UI.

### Chaos on a proxy

mountebank applies a proxy's behaviors to the backend's response **before recording it**, so the proxy mode
matters:

| `proxyMode` with `chaos`     | Result                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `proxyTransparent` (default) | Every call goes to the backend and gets its own chaos. Nothing is recorded. Use this.     |
| `proxyAlways`                | Live calls work the same, but recordings capture injected errors as if they were real.    |
| `proxyOnce`                  | Rejected by the builder: it would record one outcome (maybe an error) and replay it forever. |

When `chaos` is set and `proxyMode` isn't, the builder uses `proxyTransparent` (without chaos the default stays
`proxyAlways`).
- `proxyAlways` keeps growing the imposter's stub list during long runs. Prefer `proxyTransparent` when you don't
  need the recordings.
