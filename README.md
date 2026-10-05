# Shelf

Static site (`public/`) + a Netlify Function (`netlify/functions/books.mjs`) backed by Netlify Database (Postgres).

## Database
- Schema: `netlify/database/migrations/` (applied automatically on each deploy)
- Queries: `netlify/functions/books.mjs` via `@netlify/database`
- To change the schema, add a NEW migration file with a later timestamp. Never edit an applied one.

## Run locally (Node 20.12.2+)
    npm install
    npx netlify-cli dev
    npx netlify-cli database migrations apply   # first run only, in a second terminal

## Deploy
Push to GitHub; Netlify provisions the database and runs migrations on deploy.
Netlify Database requires a credit-based Netlify plan.

## API
GET /api/books · POST /api/books · PUT /api/books/:id · DELETE /api/books/:id
