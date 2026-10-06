# End-to-end suite (frontend ↔ real backend)

Drives the frontend's actual RTK Query endpoints (`src/store/api/*`, including
their response unwrapping) against the real DezenMart backend, so a contract
drift on either side fails here.

One command (starts and stops the backend harness for you):

```bash
BACKEND_DIR=/path/to/dezenmart-backend npm run test:e2e:full
```

Or by hand:

```bash
# 1. In the backend repo: real server + in-memory Mongo + stub Pandascrow
E2E_OUT=/tmp/dezenfoods-e2e.json npx ts-node --transpile-only scripts/e2e/harness.ts
# wait for E2E_READY, then in this repo:
E2E_FILE=/tmp/dezenfoods-e2e.json npm run test:e2e
```

Not covered: image upload (Cloudinary), the Google sign-in redirect, browser
rendering. Pandascrow is a stub, so its real request/response behaviour is not
exercised.
