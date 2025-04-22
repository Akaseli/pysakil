FROM node:23-slim

WORKDIR /app

ENV VITE_MAP_URL="https://map.akaseli.dev"

COPY package.json ./
COPY package-lock.json ./
COPY turbo.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm install
RUN npx turbo run build

ENV PORT=4500

EXPOSE ${PORT}

CMD ["node", "build/backend/index.js"]
