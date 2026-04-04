# Tactical Manager Too

Monorepo for a retro-inspired football manager web app based on the old Tactical Manager vibe.

## Folder structure

```text
.
├── apps
│   ├── backend
│   │   ├── prisma
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── src
│   │   │   └── index.ts
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend
│       ├── src
│       │   ├── styles
│       │   │   └── index.css
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── Dockerfile
│       ├── index.html
│       ├── package.json
│       ├── postcss.config.cjs
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       └── vite.config.ts
├── packages
│   └── shared
│       ├── src
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── .eslintrc.cjs
├── .prettierignore
├── .prettierrc
├── docker-compose.yml
├── package.json
└── tsconfig.base.json
```

## package.json files

### Root (`package.json`)

```json
{
  "name": "tactical-manager-too",
  "private": true,
  "version": "0.1.0",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "concurrently \"npm:dev:backend\" \"npm:dev:frontend\"",
    "dev:backend": "npm run dev --workspace @tmt/backend",
    "dev:frontend": "npm run dev --workspace @tmt/frontend",
    "build": "npm run build --workspaces",
    "lint": "npm run lint --workspaces",
    "format": "prettier --write ."
  }
}
```

### Frontend (`apps/frontend/package.json`)

```json
{
  "name": "@tmt/frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

### Backend (`apps/backend/package.json`)

```json
{
  "name": "@tmt/backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "tsx prisma/seed.ts"
  }
}
```

### Shared (`packages/shared/package.json`)

```json
{
  "name": "@tmt/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint src --ext .ts"
  }
}
```

## docker-compose.yml

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    container_name: tmt-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: tactical_manager
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    container_name: tmt-backend
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/tactical_manager
      PORT: 4000
      CLIENT_ORIGIN: http://localhost:5173
    ports:
      - '4000:4000'

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
    container_name: tmt-frontend
    depends_on:
      - backend
    environment:
      VITE_API_URL: http://localhost:4000
    ports:
      - '5173:5173'

volumes:
  postgres_data:
```

## Run instructions

### Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start PostgreSQL (Docker):
   ```bash
   docker compose up -d postgres
   ```
3. Copy backend env and run migrations + seed:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   npm run prisma:migrate --workspace @tmt/backend
   npm run prisma:seed --workspace @tmt/backend
   ```
4. Start frontend + backend:
   ```bash
   npm run dev
   ```

### Full dockerized run

```bash
docker compose up --build
```

Then open:
- Frontend: http://localhost:5173
- Backend health: http://localhost:4000/health
