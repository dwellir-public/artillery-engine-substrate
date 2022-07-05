FROM node:16-alpine
LABEL maintainer="hello@dwellir.com"

WORKDIR /home/node/artillery-engine-substrate

COPY package*.json ./
RUN npm --ignore-scripts --production install

COPY . ./
ENTRYPOINT ["node_modules/.bin/artillery"]
