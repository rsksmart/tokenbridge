FROM node:16

WORKDIR /home/node
USER node

COPY --chown=node:node ./federator/package*.json ./federator/
WORKDIR ./federator
RUN npm install

WORKDIR ../
COPY --chown=node:node ./bridge/abi ./bridge/abi/
COPY --chown=node:node ./federator/ ./federator/

WORKDIR ./federator
RUN npx tsc --build

WORKDIR ./built/federator
CMD ["npm","run","start"]
