import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddTrackingDto {
  @ApiProperty({ example: '1254810245', description: 'Трек-номер отправления' })
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;

  @ApiProperty({ example: 'CDEK', description: 'Служба доставки', required: false })
  @IsOptional()
  @IsString()
  carrier?: string;
}