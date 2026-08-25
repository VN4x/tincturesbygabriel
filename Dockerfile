FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json bun.lock package-lock.json* ./
RUN npm install
COPY . .
# EPUB stays out of the image; mount it at runtime.
RUN rm -rf private *.epub *.pdf
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server
ENV BOOK_PATH=/data/books/metsa-vagi.epub
RUN useradd --system --uid 1001 book
COPY --from=builder --chown=book:book /app/.output /app/.output
COPY --from=builder --chown=book:book /app/package.json /app/package.json
USER book
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
