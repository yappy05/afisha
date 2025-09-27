FROM --platform=linux/amd64 node:20-slim

RUN apt-get update && apt-get install -y \
    chromium \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /usr/src/app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем остальной код и собираем приложение
COPY . .
RUN npm run build

# Команда запуска с миграциями
CMD ["npm", "run", "start:prod"]