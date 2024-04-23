# Build
FROM node:18-alpine AS build

WORKDIR /usr/src/app

COPY . .

RUN npm ci
RUN npm run build

# Production
FROM node:18-alpine

WORKDIR /app

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/dist ./dist

RUN npm ci --production

CMD [ "/app/dist/src/index.js" ]