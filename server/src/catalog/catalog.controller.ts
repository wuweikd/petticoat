import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { CatalogService } from './catalog.service';
import {
  CreateBrandDto,
  CreateItemDto,
  CreateVariantDto,
  UpdateBrandDto,
  UpdateItemDto,
  UpdateVariantDto,
} from './dto/catalog.dto';

@Controller('admin/catalog')
@Roles(UserRole.EDITOR, UserRole.ADMIN)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('brands')
  listBrands(@Query('q') q?: string) {
    return this.catalog.listBrands(q);
  }

  @Post('brands')
  createBrand(@Body() dto: CreateBrandDto) {
    return this.catalog.createBrand(dto.name);
  }

  @Patch('brands/:id')
  updateBrand(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.catalog.updateBrand(id, dto.name);
  }

  @Get('brands/:id')
  async getBrand(@Param('id') id: string) {
    const brand = await this.catalog.getBrand(id);
    if (!brand) throw new NotFoundException('品牌不存在');
    return brand;
  }

  @Get('items')
  listItems(@Query('q') q?: string) {
    return this.catalog.listItems(q);
  }

  @Get('items/:id')
  async getItem(@Param('id') id: string) {
    const item = await this.catalog.getItem(id);
    if (!item) throw new NotFoundException('物品不存在');
    return item;
  }

  @Post('items')
  createItem(@CurrentUser() user: AuthUser, @Body() dto: CreateItemDto) {
    return this.catalog.createItem(user, dto);
  }

  @Patch('items/:id')
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.catalog.updateItem(user, id, dto);
  }

  @Post('items/:id/variants')
  createVariant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.catalog.createVariant(user, id, dto);
  }

  @Patch('variants/:id')
  updateVariant(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.catalog.updateVariant(user, id, dto);
  }

  @Delete('variants/:id')
  deleteVariant(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalog.deleteVariant(user, id);
  }
}
