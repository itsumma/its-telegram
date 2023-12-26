FROM node:20-slim as builder
RUN npm i -g pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY patches /app/patches
RUN pnpm i

COPY . .
RUN pnpm build

FROM nginx:1.17.10-alpine as runtime
WORKDIR /app

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.docker.conf /etc/nginx/conf.d
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/public /app/dist