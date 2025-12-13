import { Controller, Post, Body, UseGuards, Get, Put, Param, ParseIntPipe, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ProductsService } from '../services/products.service';
import { CreateProductDto, UpdateProductDto } from '../dto/catalog.dto';

@ApiTags('Catalog (Supplier)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новый товар (Поставщик)' })
  async create(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(companyId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Получить мои товары' })
  async getMyProducts(@CurrentUser('companyId') companyId: number) {
    return this.productsService.getMyProducts(companyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить товар' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, companyId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить товар' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    return this.productsService.delete(id, companyId);
  }
}