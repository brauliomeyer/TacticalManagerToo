FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm install

COPY . .
RUN npm run prisma:generate --workspace @tmt/backend
RUN npm run build --workspace @tmt/shared && npm run build --workspace @tmt/backend

EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "@tmt/backend"]
