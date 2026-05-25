# Byggsteg för serverapplikation
FROM node:18-alpine AS server-build
WORKDIR /server

# Argument för miljövariabler
ARG NODE_ENV
ARG PORT=3010
ARG DATABASE
ARG UPLOAD_PATH
ARG USE_AZURE_STORAGE
ARG AZURE_STORAGE_CONNECTION_STRING
ARG AZURE_STORAGE_CONTAINER_NAME

# Använd ARG för att sätta ENV
ENV NODE_ENV=${NODE_ENV} \
    PORT=${PORT} \
    DATABASE=${DATABASE} \
    UPLOAD_PATH=${UPLOAD_PATH} \
    USE_AZURE_STORAGE=${USE_AZURE_STORAGE} \
    AZURE_STORAGE_CONNECTION_STRING=${AZURE_STORAGE_CONNECTION_STRING} \
    AZURE_STORAGE_CONTAINER_NAME=${AZURE_STORAGE_CONTAINER_NAME}


COPY ./server/package*.json ./
COPY ./server/tsconfig.json ./
RUN npm install
COPY ./server/ ./
COPY ./shared/ ../shared/
RUN npm run build:unix

# Slutlig körningsbar container
FROM node:18-alpine
WORKDIR /app
COPY --from=server-build /server/dist ./dist
COPY --from=server-build /server/node_modules ./node_modules
COPY --from=server-build /server/tsconfig.json ./tsconfig.json

# Exponera porten din server lyssnar på
EXPOSE 3010

# Startkommando
CMD ["node", "--enable-source-maps", "dist/server/src/server.js"]
