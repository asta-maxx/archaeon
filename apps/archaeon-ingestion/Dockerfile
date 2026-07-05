FROM node:22-slim AS builder
WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm run build
RUN pnpm prune --prod --ignore-scripts --config.confirmModulesPurge=false

FROM node:22-slim AS runner
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE ${PORT:-3000}

CMD ["node", "dist/main.js"]
