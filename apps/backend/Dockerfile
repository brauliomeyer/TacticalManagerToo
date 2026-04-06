FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm install

COPY . .
RUN npm run build --workspace @tmt/shared && npm run build --workspace @tmt/backend
RUN npm prune --production

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
