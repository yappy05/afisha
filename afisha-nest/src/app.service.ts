import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Event, EventDocument } from './common/lib/shemas/event.shema';
import { Model } from 'mongoose';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ParseRequestDto } from './common/lib/dto/parse.request.dto';
import Redis from 'ioredis';
import { testRedisConnection } from './common/lib/dbConnectionTests/redis.test.connection';
import { testMongoConnection } from './common/lib/dbConnectionTests/mongo.test.connection';
import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ParsingService } from './parsing/parsing.service';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly parsingService: ParsingService,
  ) {
    testRedisConnection(redis);
    testMongoConnection(eventModel);
  }

  public async getEvents(dto: ParseRequestDto) {
    const CACHE_TTL = 3600;
    const { city, category, formattedDate } = dto;
    const cacheKey = `afisha:${city}:${category}:${formattedDate}`;
    console.log('key is:', cacheKey);

    const cachedEvents = await this.redis.get(cacheKey);
    console.log('Cached data:', cachedEvents);

    if (cachedEvents) {
      console.log('✅ данные взяты из Redis');
      return JSON.parse(cachedEvents) as Event[];
    }

    const events = await this.eventModel
      .find({
        city,
        category,
        formattedDate,
      })
      .lean()
      .exec();

    if (events && events.length > 0) {
      console.log('✅ данные взяты из Mongoose');
      await this.redis.set(cacheKey, JSON.stringify(events), 'EX', CACHE_TTL);
      console.log('✅ данные сохранены в Redis');

      return events;
    }

    console.log('❌ данные не найдены');
    console.log('спарсим новые данные');
    const response = await this.parsingService.parseYandexAfisha(dto);
    console.log(response);
    return response;
  }
}
