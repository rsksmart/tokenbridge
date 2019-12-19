FROM node:10.17.0-alpine3.10

RUN apk add --no-cache python2 build-base

COPY ./federator /app/federator
COPY ./abis /app/abis

RUN chown -R node:node /app
USER node
WORKDIR /app/federator

RUN npm install

ENTRYPOINT [ "npm", "start" ]