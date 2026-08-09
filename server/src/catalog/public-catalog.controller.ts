import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/auth.decorators';
import { CatalogService } from './catalog.service';

/** C-end guest-readable catalog */
@Controller('catalog')
export class PublicCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get('search')
  search(@Query('q') q = '') {
    return this.catalog.searchPublic(q);
  }

  @Public()
  @Get('brands')
  brands(@Query('q') q?: string) {
    return this.catalog.listBrands(q);
  }
}
