FROM node:17-alpine

WORKDIR /app
COPY . .
RUN npm install

ENV RPC wss://hydradx-rococo-rpc.play.hydration.cloud

CMD ["npm", "start"]