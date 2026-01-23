# Acquisitions – Docker & Neon Setup

This project is configured to use:

- **Neon Local** for local development (via Docker)
- **Neon Cloud** (serverless PostgreSQL) for production

The Node.js app uses `@neondatabase/serverless` + `drizzle-orm` and reads `DATABASE_URL` from the environment (`src/config/database.js`).

---

## Environments

### Development – Neon Local

Neon Local runs as a Docker service and:

- Connects to your Neon project using `NEON_API_KEY` + `NEON_PROJECT_ID`
- Creates **ephemeral branches** from `PARENT_BRANCH_ID` when the container starts
- Deletes the ephemeral branch when the container stops
- Exposes a local Postgres-compatible endpoint on port **5432**

The app connects using a standard Postgres URL:

```bash path=null start=null
postgres://neon:npg@neon-local:5432/acquisitions?sslmode=require
```

(`neon-local` is the service name in `docker-compose.dev.yml`.)

#### Setup

1. Copy `.env.development` and fill in your Neon values:

   ```bash path=null start=null
   cp .env.development .env
   # Edit .env to set NEON_API_KEY, NEON_PROJECT_ID, PARENT_BRANCH_ID, etc.
   ```

   Or export them directly in your shell:

   ```powershell path=null start=null
   $env:NEON_API_KEY     = "your_neon_api_key"
   $env:NEON_PROJECT_ID  = "your_neon_project_id"
   $env:PARENT_BRANCH_ID = "your_parent_branch_id"
   ```

2. Start the dev stack:

   ```bash path=null start=null
   docker compose -f docker-compose.dev.yml up --build
   ```

   This will:

   - Start `neon-local` (Neon Local proxy, ephemeral branch)
   - Start `acquisitions-app-dev` running `npm run dev`
   - Expose the API at `http://localhost:3000`

3. On every start, Neon Local creates a **fresh ephemeral database branch** from `PARENT_BRANCH_ID`, ideal for clean dev & testing.

---

### Production – Neon Cloud (serverless)

In production we **do not run Neon Local**. Instead the app connects directly to the Neon Cloud database using a Neon-provided connection string such as:

```bash path=null start=null
postgres://user:password@ep-xxxx.neon.tech/neondb?sslmode=require
```

Set the following env vars in your production environment:

- `NODE_ENV=production`
- `DATABASE_URL=<Neon Cloud connection string>`
- Other secrets as appropriate (e.g. `JWT_SECRET`, `ARCJET_KEY`)

#### Build the image

```bash path=null start=null
docker build -t acquisitions-app:latest .
```

#### Run with docker-compose.prod.yml

For a simple single-host deployment:

```bash path=null start=null
# Make sure DATABASE_URL and other secrets are set
$env:DATABASE_URL = "postgres://user:password@ep-xxxx.neon.tech/neondb?sslmode=require"

docker compose -f docker-compose.prod.yml up -d
```

This will:

- Run `acquisitions-app-prod` from `acquisitions-app:latest`
- Expose port `3000` on the host
- Connect to Neon Cloud using `DATABASE_URL`

In a real production environment (Kubernetes, ECS, etc.), use the same image and inject `DATABASE_URL` and secrets via your platform’s secret manager.

---

## Switching Between Dev and Prod

- **Development**
  - Use `docker-compose.dev.yml`
  - `NODE_ENV=development`
  - `DATABASE_URL=postgres://neon:npg@neon-local:5432/acquisitions?sslmode=require`
  - Neon Local container manages ephemeral branches

- **Production**
  - Use `docker-compose.prod.yml` or your orchestrator
  - `NODE_ENV=production`
  - `DATABASE_URL=postgres://...neon.tech/...`
  - No Neon Local; DB is managed by Neon Cloud

The application code always reads `process.env.DATABASE_URL`; only the environment differs between dev and prod.
