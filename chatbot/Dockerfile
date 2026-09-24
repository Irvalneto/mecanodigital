FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
RUN mkdir -p /app/data && chown node:node /app/data
ENV NODE_ENV=production
# Monte um volume em /app/data para não perder conversas e leads a cada deploy.
VOLUME ["/app/data"]
EXPOSE 3000
USER node
CMD ["node", "src/server.js"]
