import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsNumber, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// --- Create / Update Product ---

export class CreateVariantDto {
  @ApiProperty({ example: 'Упаковка 1кг', description: 'Название варианта (SKU)' })
  @IsString()
  @IsNotEmpty()
  variantName: string;

  @ApiProperty({ example: 'MILK-001', description: 'Артикул', required: false })
  @IsString()
  @IsOptional() // Теперь это поле не обязательно
  sku?: string;

  @ApiProperty({ example: 150.00, description: 'Цена' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 10, description: 'Минимальный заказ' })
  @IsInt()
  @Min(1)
  minOrderQuantity: number;

  @ApiProperty({ example: 1, description: 'ID единицы измерения' })
  @IsInt()
  measurementUnitId: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Молоко Домик в деревне', description: 'Название товара' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Пастеризованное, 3.2%', description: 'Описание', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, description: 'ID категории' })
  @IsInt()
  productCategoryId: number;

  @ApiProperty({ type: [CreateVariantDto], description: 'Варианты товара (фасовка)' })
  @IsArray()
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}

export class UpdateProductDto extends CreateProductDto {}

// --- Search ---

export class SearchProductDto {
  @ApiPropertyOptional({ description: 'Поисковая строка (название, описание, SKU)' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'ID категории' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Минимальная цена' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Максимальная цена' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Лимит выборки', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Смещение (пагинация)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offset?: number = 0;
}