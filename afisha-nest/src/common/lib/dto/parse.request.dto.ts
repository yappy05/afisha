import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiResponse } from '@nestjs/swagger';
import { City } from '../enums/city.enum';
import { Category } from '../enums/category.enum';
import { Transform } from 'class-transformer';
import { createDayRangeString } from '../utils/createDayRangeString';

export class ParseRequestDto {
  @ApiProperty({
    description: 'Город для поиска событий',
    enum: City,
    example: City.MOSCOW,
  })
  @IsEnum(City, {
    message: `Город должен быть одним из: ${Object.values(City).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Город обязателен' })
  readonly city: City;

  @ApiPropertyOptional({
    description:
      'Категория событий (опционально). Если не указать категорию то предет ответ со всеми событиями в этот день',
    enum: Category,
    example: Category.SPORT,
  })
  @IsEnum(Category, {
    message: `Категория должна быть одной из: ${Object.values(Category).join(', ')}`,
  })
  @IsOptional()
  readonly category?: Category = Category.ALL;

  @IsNotEmpty({ message: 'Дата обязательна' })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}$/, {
    message: 'Неверный формат даты. Используйте: YYYY-MM-DDTHH:mm:ss+HH:mm'
  })
  @ApiProperty({
    description:
      'Дата для поиска событий за весь день (с 00:00 до 23:59). Формат: YYYY-MM-DDTHH:mm:ss±HH:mm',
    example: '2025-10-04T15:30:00+03:00',
    type: String,
  })
  readonly date: Date;

  @ApiPropertyOptional({
    description:
      'Зависит от интернета, лучше оставить 2000. Если инетрнет хороший то для скорости можно снизить до 1000',
    default: 2000,
    example: 3000,
  })
  @IsOptional()
  @IsNumber()
  readonly delay: number = 2000;

  @ApiPropertyOptional({
    description: 'Количество страниц для парсинга',
    default: 3,
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  readonly countPages: number = 3;
}
