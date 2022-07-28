FROM node:17-alpine

WORKDIR /app
COPY . .
RUN npm install

ENV TESTNET_RPC_ENDPOINT wss://basilisk-testnet-rpc.bsx.fi
ENV ROCOCO_RPC_ENDPOINT wss://rpc-01.basilisk-rococo.hydradx.io

CMD ["npm", "start"]