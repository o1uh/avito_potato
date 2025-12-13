import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SearchService } from '../services/search.service';
import { SearchProductDto } from '../dto/catalog.dto';

@ApiTags('Catalog (Search)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Поиск доступен только авторизованным (согласно ТЗ)
@Controller('catalog/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Поиск товаров (Elasticsearch)' })
  async search(@Body() dto: SearchProductDto) {
    return this.searchService.search(dto);
  }
}