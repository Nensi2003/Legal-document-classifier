FROM node:22-bookworm

# Install LibreOffice for legacy .doc conversion
RUN apt-get update && \
    apt-get install -y --no-install-recommends libreoffice && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json yarn.lock* ./

RUN yarn install

COPY . .

# Generate Prisma contract
RUN yarn prisma contract emit

ENV NODE_ENV=production

EXPOSE 3000

CMD ["yarn", "dev"]