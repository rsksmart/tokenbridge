FROM node:16.6.1-alpine3.13

RUN apk add --no-cache python2 build-base


COPY --chown=node:node ./federator /app/federator
COPY --chown=node:node ./bridge/abi /app/bridge/abi

WORKDIR /app/federator

RUN chown -R node:node .

USER node

RUN npm ci

ENTRYPOINT [ "npm", "start" ]