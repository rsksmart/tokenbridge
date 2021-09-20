FROM node:16.6.1-alpine3.13
USER node

RUN apk add --no-cache python2 build-base

COPY ./federator /app/federator
COPY ./bridge/abi /app/bridge/abi

WORKDIR /app/federator

RUN npm ci
RUN npm run build

ENTRYPOINT [ "npm", "start" ]