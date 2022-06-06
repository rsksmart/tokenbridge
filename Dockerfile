FROM node:16-alpine

RUN apk add --no-cache build-base git python3

WORKDIR /home/node
USER node

COPY --chown=node:node ./federator/package*.json ./federator/
WORKDIR ./federator
RUN npm ci

WORKDIR ../
COPY --chown=node:node ./bridge/abi ./bridge/abi/
COPY --chown=node:node ./federator/ ./federator/

WORKDIR ./federator
RUN (cd ./config/ && cp config.sample.js config.js) && \
    npx tsc --build

WORKDIR ./built/federator
CMD ["node", "./src/main.js"]
