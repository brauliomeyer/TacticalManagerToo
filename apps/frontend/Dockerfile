FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm install

COPY . .
RUN npm run build --workspace @tmt/shared && npm run build --workspace @tmt/frontend

EXPOSE 5173
CMD ["npm", "run", "preview", "--workspace", "@tmt/frontend", "--", "--host", "0.0.0.0", "--port", "5173"]
