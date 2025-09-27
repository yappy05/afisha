import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Event, EventDocument } from './common/lib/shemas/event.shema';
import { Model } from 'mongoose';
import { ParseRequestDto } from './common/lib/dto/parse.request.dto';
import Redis from 'ioredis';
import { testRedisConnection } from './common/lib/dbConnectionTests/redis.test.connection';
import { testMongoConnection } from './common/lib/dbConnectionTests/mongo.test.connection';
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
    const { city, category, date } = dto;
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const cacheKey = `afisha:${city}:${category}:${date}`;
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
        date,
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
    const eventsResponse: Event[] =
      await this.parsingService.parseYandexAfisha(dto);
    if (eventsResponse.length > 0) {
      try {
        await this.redis.setex(
          cacheKey,
          CACHE_TTL,
          JSON.stringify(eventsResponse),
        );
      } catch (e) {
        console.error('не удалось сохранить в редис новые данные', e);
      }
      try {
        await this.eventModel.insertMany(eventsResponse);
      } catch (e) {
        console.error('не удалось сохранить в монго новые данные', e);
      }
    }
    return eventsResponse;
  }
}
