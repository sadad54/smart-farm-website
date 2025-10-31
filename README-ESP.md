ESP integration (local ESP32 over HTTP)

1) Configure environment variables (create `.env.local` if needed):

```
NEXT_PUBLIC_ESP_BASE_URL=http://192.168.125.24
ESP_BASE_URL=http://192.168.125.24
```

- The client UI polls via `/api/esp/dht` and sends commands via `/api/esp/set`.
- These API routes proxy to your ESP (so the browser avoids CORS issues). If the proxy fails, the UI will try the direct device URL.
- When no URL is provided the UI falls back to a mock mode so you can still see the UI change.

2) ESP firmware CORS (optional but recommended)

Add the following to responses for `/dht` and `/set`:

```
response->addHeader("Access-Control-Allow-Origin", "*");
```

And optionally handle OPTIONS preflight for `/set`.

3) Run locally

```
pnpm dev
```

Open http://localhost:3000 and look for the ESP status indicator in the header.

4) Troubleshooting

- If the indicator is red (Offline), check you can fetch from your machine:

```
curl -v http://192.168.125.24/dht
```

- If that times out, your PC and the ESP are likely on different networks or the ESP is not serving `/dht` yet.
