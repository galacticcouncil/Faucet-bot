FROM node:17-alpine

WORKDIR /app
COPY . .
RUN npm install

ENV TESTNET_RPC_ENDPOINT wss://rpc01.hydration.dev
ENV ROCOCO_RPC_ENDPOINT wss://rococo-basilisk-rpc.hydration.dev

CMD ["npm", "start"]