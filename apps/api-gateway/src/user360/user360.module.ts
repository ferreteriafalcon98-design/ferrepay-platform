import { Module } from '@nestjs/common';
import { User360Controller } from './user360.controller';
import { User360Service } from './user360.service';

@Module({
  controllers: [User360Controller],
  providers: [User360Service],
})
export class User360Module {}
