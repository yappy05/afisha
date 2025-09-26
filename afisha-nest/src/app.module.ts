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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        url: config.getOrThrow<string>('REDIS_URL'),
      }),
    }),
    ParsingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: ConfigService) => {
        return new Redis(config.getOrThrow<string>('REDIS_URL'));
      },
      inject: [ConfigService],
    },
    ParsingService,
  ],
})
export class AppModule {}
