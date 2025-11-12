FROM node:20-alpine3.19 AS base

FROM base AS builder

WORKDIR /home/build

COPY package*.json ./

RUN npm install

COPY . .

FROM base AS runner

WORKDIR /home/app

COPY --from=builder /home/build/ ./
COPY --from=builder /home/build/package*.json .

RUN npm install --omit=dev

EXPOSE 8000

CMD ["npm", "start"]