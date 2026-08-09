import { Module } from '@nestjs/common';
import {
  PublicWardrobeController,
  WardrobeController,
} from './wardrobe.controller';
import { WardrobeService } from './wardrobe.service';

@Module({
  controllers: [WardrobeController, PublicWardrobeController],
  providers: [WardrobeService],
  exports: [WardrobeService],
})
export class WardrobeModule {}
