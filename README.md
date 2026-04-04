# Tactical Manager Too

A fullstack monorepo starter for a **football manager webapp** inspired by old-school Tactical Manager style.

## 1) Full folder structure

```text
.
├── .eslintrc.cjs
├── .gitignore
├── .prettierignore
├── .prettierrc
├── LICENSE
├── README.md
├── apps
│   ├── backend
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── prisma
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── src
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   └── frontend
│       ├── Dockerfile
│       ├── index.html
│       ├── package.json
│       ├── postcss.config.cjs
│       ├── src
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── styles
│       │       └── index.css
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       └── vite.config.ts
├── docker-compose.yml
├── package.json
├── packages
│   └── shared
│       ├── package.json
│       ├── src
│       │   └── index.ts
│       └── tsconfig.json
└── tsconfig.base.json
```

## 2) All package.json files

### Root `package.json`

```json
{
  "name": "tactical-manager-too",
  "private": true,
  "version": "0.1.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm:dev:backend\" \"npm:dev:frontend\"",
    "dev:backend": "npm run dev --workspace @tmt/backend",
    "dev:frontend": "npm run dev --workspace @tmt/frontend",
    "build": "npm run build --workspaces",
    "lint": "ESLINT_USE_FLAT_CONFIG=false npm run lint --workspaces",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.30.0",
    "@typescript-eslint/parser": "^8.30.0",
    "concurrently": "^9.1.2",
    "eslint": "^8.57.1",
    "eslint-config-prettier": "^10.1.2",
    "eslint-plugin-import": "^2.31.0",
    "prettier": "^3.5.3",
    "typescript": "^5.8.3"
  }
}
```

### `apps/frontend/package.json`

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
  },
  "dependencies": {
    "@tmt/shared": "0.1.0",
    "axios": "^1.8.4",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "socket.io-client": "^4.8.1"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "vite": "^6.2.2"
  }
}
```

### `apps/backend/package.json`

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
  },
  "dependencies": {
    "@prisma/client": "^6.5.0",
    "@tmt/shared": "0.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "socket.io": "^4.8.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.1",
    "@types/node": "^22.13.14",
    "prisma": "^6.5.0",
    "tsx": "^4.19.3"
  }
}
```

### `packages/shared/package.json`

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

## 3) docker-compose.yml

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

## 4) Run instructions

### Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start PostgreSQL with Docker:
   ```bash
   docker compose up -d postgres
   ```
3. Configure backend env:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```
4. Run Prisma migrations + seed:
   ```bash
   npm run prisma:migrate --workspace @tmt/backend
   npm run prisma:seed --workspace @tmt/backend
   ```
5. Start frontend + backend in dev mode:
   ```bash
   npm run dev
   ```
6. Open app:
   - Frontend: http://localhost:5173
   - Backend health: http://localhost:4000/health

### Fully dockerized

```bash
docker compose up --build
```

If needed, run Prisma commands from the backend container:

```bash
docker compose exec backend npm run prisma:migrate
docker compose exec backend npm run prisma:seed
```


## GitHub Pages (fix for 404 on `/TacticalManagerToo/`)

This repo now includes a workflow at `.github/workflows/deploy-frontend-pages.yml` that builds and deploys the frontend to GitHub Pages with the correct base path.

1. Push this branch to `main`.
2. In GitHub repo settings, go to **Pages**.
3. Set **Source** to **GitHub Actions**.
4. Wait for the workflow **Deploy Frontend to GitHub Pages** to succeed.

The app will be published at:

- `https://brauliomeyer.github.io/TacticalManagerToo/`
