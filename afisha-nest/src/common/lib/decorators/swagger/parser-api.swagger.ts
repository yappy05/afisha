import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ParseRequestDto } from '../../dto/parse.request.dto';

export function ApiParser() {
  return applyDecorators(
    ApiOperation({
      summary: 'Парсинг событий афиши',
      description:
        'Получает события с Timepad для указанного города, категории и даты',
    }),
    ApiBody({
      type: ParseRequestDto,
      description: 'Параметры для парсинга',
      examples: {
        example1: {
          summary: 'Спорт в Москве',
          value: {
            city: 'moscow',
            category: 'sport',
            formattedDate:
              '2025-09-27T00%3A00%3A00%2B03%3A00%2C2025-09-26T23%3A59%3A59%2B03%3A00',
          },
        },
        example2: {
          summary: 'Концерты в Санкт-Петербурге',
          value: {
            city: 'saint-petersburg',
            category: 'koncerty',
            formattedDate:
              '2025-09-27T00%3A00%3A00%2B03%3A00%2C2025-09-26T23%3A59%3A59%2B03%3A00',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Успешный парсинг событий',
      schema: {
        example: [
          {
            city: 'moscow',
            category: 'sport',
            formattedDate:
              '2025-09-27T00%3A00%3A00%2B03%3A00%2C2025-09-26T23%3A59%3A59%2B03%3A00',
            title: 'Футбольный мач: Спартак vs Зенит',
            place: 'Стадион Лужники',
            time: '19:00',
            link: 'https://afisha.timepad.ru/event/123456/',
          },
        ],
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Невалидные параметры запроса',
      schema: {
        example: {
          statusCode: 400,
          message: [
            'Город должен быть одним из: moscow, saint-petersburg, ...',
            'Формат даты должен быть: YYYY-MM-DDTHH%3Amm%3Ass%2BXX%3AXX%2CYYYY-MM-DDTHH%3Amm%3Ass%2BXX%3AXX',
          ],
          error: 'Bad Request',
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Ошибка сервера при парсинге',
      schema: {
        example: {
          statusCode: 500,
          message: 'Ошибка парсинга: Не удалось загрузить страницу',
          error: 'Internal Server Error',
        },
      },
    }),
  );
}
