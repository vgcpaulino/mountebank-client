ARG IMAGE_NAME=node
ARG IMAGE_TAG=16.16.0

FROM ${IMAGE_NAME}:${IMAGE_TAG} as base
WORKDIR /src
COPY package.json package.json
RUN yarn
COPY . .

FROM base as mock-provider
ENTRYPOINT [ "yarn", "start:dev" ]

FROM base as tests-unit
ENTRYPOINT [ "yarn", "test:unit" ]

FROM base as tests-integration
ENV DOCKER=true
ENV MOUNTEBANK_URL=http://mock-provider:2525
ENTRYPOINT [ "yarn", "test:integration" ]