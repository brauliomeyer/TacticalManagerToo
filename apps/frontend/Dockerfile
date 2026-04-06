FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm install

COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --workspace @tmt/shared && npm run build --workspace @tmt/frontend

FROM nginx:alpine
RUN apk add --no-cache curl
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
