import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsNumber, IsDateString, ValidateNested, IsArray } from 'class-validator';
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

// --- Deals ---
export class CreateDealFromOfferDto {
  @ApiProperty({ description: 'ID принятого коммерческого предложения' })
  @IsInt()
  offerId: number;
}

// Вспомогательный DTO для элементов сделки (если создается вручную, не через Offer)
export class DealItemDto {
  @IsInt()
  productVariantId: number;
  
  @IsInt()
  quantity: number;
}