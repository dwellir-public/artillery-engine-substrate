FROM node:16-alpine
LABEL maintainer="hello@dwellir.com"

WORKDIR /home/node/substrate-engine

RUN npm install --location=global artillery
RUN npm install --location=global artillery-engine-substrate

ENTRYPOINT ["artillery"]
