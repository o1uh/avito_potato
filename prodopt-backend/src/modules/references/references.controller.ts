import { Controller, Get } from '@nestjs/common';
import { ReferencesService } from './references.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('References') // Группировка в Swagger
@Controller('references')
export class ReferencesController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Получить список категорий товаров' })
  async getCategories() {
    const data = await this.referencesService.getCategories();
    return { data };
  }

  @Get('units')
  @ApiOperation({ summary: 'Получить единицы измерения' })
  async getUnits() {
    const data = await this.referencesService.getUnits();
    return { data };
  }

  @Get('org-types')
  @ApiOperation({ summary: 'Получить типы организаций' })
  async getOrgTypes() {
    const data = await this.referencesService.getOrgTypes();
    return { data };
  }
}