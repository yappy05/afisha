import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { ParseRequestDto } from './common/lib/dto/parse.request.dto';
import { ApiParser } from './common/lib/decorators/swagger/parser-api.swagger';

@ApiTags('Parser') // Группировка в Swagger UI
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('api/parser')
  @ApiParser()
  public parsing(@Body() dto: ParseRequestDto) {
    return this.appService.getEvents(dto);
  }
}
