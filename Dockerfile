###################################################
# Stage: frontend-base
###################################################
FROM node:22-alpine AS frontend-base
WORKDIR /app/frontend

###################################################
# Stage: frontend-dev
###################################################
FROM frontend-base AS frontend-dev
EXPOSE 5173
CMD ["sh", "-c", "npm install && npm run dev -- --host"]

###################################################
# Stage: frontend-prod
###################################################
FROM frontend-base AS frontend-prod
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build
FROM node:22-alpine AS prod-server
WORKDIR /app/frontend
RUN npm install -g serve
COPY --from=frontend-prod /app/frontend/dist .
EXPOSE 5173
CMD ["serve", "-s", "."]