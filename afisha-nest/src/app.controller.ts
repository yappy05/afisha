import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ParseRequestDto } from './common/lib/dto/parse.request.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('api/parser')
  public parsing(@Body() dto: ParseRequestDto) {
    return this.appService.getEvents(dto);
  }
}
