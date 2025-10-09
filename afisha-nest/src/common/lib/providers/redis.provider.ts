import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import axios from 'axios';

export const RedisProvider: FactoryProvider<Promise<Redis>> = {
  provide: 'REDIS_CLIENT',
  useFactory: async (configService: ConfigService) => {
    const redisPassword = configService.getOrThrow<string>('REDIS_PASSWORD');
    const redisUrl = configService.getOrThrow<string>('REDIS_URL');

    try {
      // Скачиваем сертификат прямо в память
      console.log('[Redis] Загрузка сертификата Yandex Cloud...');
      const response = await axios.get(
        'https://storage.yandexcloud.net/cloud-certs/CA.pem',
      );
      const certificate = response.data;

      console.log('[Redis] Сертификат загружен, создаем Redis клиент...');

      const redisClient = new Redis({
        host: 'c-c9qc5jopdeq6suvqetfd.rw.mdb.yandexcloud.net',
        port: 6380,
        password: redisPassword,
        tls: {
          ca: certificate, // Используем данные напрямую
        },
        maxRetriesPerRequest: 2,
        connectTimeout: 30000,
        commandTimeout: 30000,
      });

      redisClient.on('connect', () => {
        console.log('[Redis] Успешное подключение к Redis');
      });

      redisClient.on('error', (err) => {
        console.error('[Redis] Ошибка подключения к Redis:', err);
      });

      // Проверка соединения
      const pingResult = await redisClient.ping();
      console.log(`[Redis] Ping результат: ${pingResult}`);

      return redisClient;
    } catch (error) {
      console.error('[Redis] Ошибка при инициализации:', error);

      // Fallback - без проверки сертификата
      console.log('[Redis] Используем подключение без проверки сертификата');
      return new Redis(configService.getOrThrow<string>('REDIS_URL'), {
        tls: {},
      });
    }
  },
  inject: [ConfigService],
};
