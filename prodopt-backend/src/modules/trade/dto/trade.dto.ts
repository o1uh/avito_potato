import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsNumber, IsDateString, ValidateNested, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// --- RFQ ---
export class CreateRfqDto {
  @ApiProperty({ description: 'Комментарий к запросу' })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiPropertyOptional({ description: 'ID конкретного поставщика (если null - публичный запрос)' })
  @IsOptional()
  @IsInt()
  supplierCompanyId?: number;
}

// --- Offers ---
export class CreateOfferDto {
  @ApiProperty({ description: 'ID запроса на закупку' })
  @IsInt()
  requestId: number;

  @ApiProperty({ description: 'Предлагаемая цена (общая или за единицу, зависит от логики)' })
  @IsNumber()
  @Min(0)
  offerPrice: number;

  @ApiProperty({ description: 'Условия доставки' })
  @IsString()
  @IsNotEmpty()
  deliveryConditions: string;

  @ApiProperty({ description: 'Срок действия КП' })
  @IsDateString()
  expiresOn: string;
}

export class NegotiateOfferDto {
  @ApiPropertyOptional({ description: 'Новая цена' })
  @IsOptional()
  @IsNumber()
  offerPrice?: number;

  @ApiPropertyOptional({ description: 'Новые условия' })
  @IsOptional()
  @IsString()
  deliveryConditions?: string;
}

// --- Вспомогательный DTO для товаров ---
export class DealItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productVariantId: number;
  
  @ApiProperty({ example: 10 })
  @IsInt()
  quantity: number;
}

// --- Deals ---
export class CreateDealFromOfferDto {
  @ApiProperty({ description: 'ID принятого коммерческого предложения' })
  @IsInt()
  offerId: number;

  @ApiProperty({ description: 'Закрыть заявку после создания этой сделки?', default: false })
  @IsOptional()
  @IsBoolean()
  closeRequest?: boolean; // <-- Новое поле

  @ApiPropertyOptional({ type: [DealItemDto], description: 'Список товаров для включения в сделку' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DealItemDto)
  items?: DealItemDto[];
}

