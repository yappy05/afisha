import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { City } from '../enums/city.enum';
import { Category } from '../enums/category.enum';

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

  @ApiProperty({
    description: 'Диапазон дат в формате Timepad',
    example:
      '2025-09-27T00%3A00%3A00%2B03%3A00%2C2025-09-26T23%3A59%3A59%2B03%3A00',
  })
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}%3A\d{2}%3A\d{2}%2B\d{2}%3A\d{2}%2C\d{4}-\d{2}-\d{2}T\d{2}%3A\d{2}%3A\d{2}%2B\d{2}%3A\d{2}$/,
    {
      message:
        'Формат даты должен быть: YYYY-MM-DDTHH%3Amm%3Ass%2BXX%3AXX%2CYYYY-MM-DDTHH%3Amm%3Ass%2BXX%3AXX',
    },
  )
  @IsNotEmpty({ message: 'Дата обязательна' })
  readonly formattedDate: string;

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
