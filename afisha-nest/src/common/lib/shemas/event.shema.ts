import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {
  @Prop()
  city: string;

  @Prop()
  category: string;

  @Prop()
  date: Date;

  @Prop()
  title: string;

  @Prop()
  place: string;

  @Prop()
  time: string;

  @Prop()
  link: string;
}

export const EventSchema = SchemaFactory.createForClass(Event);
