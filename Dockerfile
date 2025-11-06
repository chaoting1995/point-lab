# Multi-stage: build frontend, then run server with dist as backup static
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
# include dist so server can serve static as fallback if needed
COPY dist ./dist
EXPOSE 8787
CMD ["node", "server/index.js"]

