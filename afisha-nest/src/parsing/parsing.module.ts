import { Module } from '@nestjs/common';
import { ParsingService } from './parsing.service';

@Module({
  controllers: [],
  providers: [ParsingService],
  exports: [ParsingService],
})
export class ParsingModule {}
