FROM node:17-alpine

WORKDIR /app
COPY . .
RUN npm install

ENV RPC wss://1.lark.hydration.cloud

CMD ["npm", "start"]
