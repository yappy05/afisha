import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventSchema } from './common/lib/shemas/event.shema';
import { ParsingService } from './parsing/parsing.service';
import { ParsingModule } from './parsing/parsing.module';
import Redis from 'ioredis';
import { redisStore } from 'cache-manager-redis-store';
import { RedisProvider } from './common/lib/providers/redis.provider';
import { RedisCertificateService } from './common/lib/providers/redis-certificate.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const user = config.get<string>('DB_USER');
        const pass = config.get<string>('DB_PASS');
        const hosts = config.getOrThrow<string>('DB_HOSTS');
        const dbName = config.getOrThrow<string>('DB_NAME');

        let mongoURL: string;

        // ВАЖНО: Добавьте ВСЕ опции прямо в URI строку
        if (user && pass) {
          mongoURL = `mongodb://${user}:${pass}@${hosts}/${dbName}?authSource=admin&directConnection=true&serverSelectionTimeoutMS=5000&connectTimeoutMS=10000`;
        } else {
          mongoURL = `mongodb://${hosts}/${dbName}?authSource=admin&directConnection=true&serverSelectionTimeoutMS=5000&connectTimeoutMS=10000`;
        }

        console.log('MongoDB FINAL URI:', mongoURL);

        // Верните ТОЛЬКО uri, без дополнительных опций
        return {
          uri: mongoURL
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Для CacheModule можно использовать упрощенный подход
        return {
          store: redisStore,
          host: 'c-c9qc5jopdeq6suvqetfd.rw.mdb.yandexcloud.net',
          port: 6380,
          password: config.get('REDIS_PASSWORD'),
          tls: {
            rejectUnauthorized: false, // Или тоже скачать сертификат
          },
        };
      },
    }),
    ParsingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RedisProvider,
    RedisCertificateService,
    ParsingService,
  ],
})
export class AppModule {}
