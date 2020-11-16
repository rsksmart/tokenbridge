FROM node:10.17.0-alpine3.10

RUN apk add --no-cache python2 build-base

COPY ./validators /app/validators
COPY ./abis /app/abis

RUN chown -R node:node /app
USER node
WORKDIR /app/validators

RUN npm install

ENTRYPOINT [ "npm", "start" ]