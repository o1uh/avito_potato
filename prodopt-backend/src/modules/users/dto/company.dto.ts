import { IsString, IsNotEmpty, Length, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ example: 'ООО "Ромашка"', description: 'Наименование' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '7711223344', description: 'ИНН' })
  @IsString()
  @Length(10, 12)
  inn: string;

  @ApiProperty({ example: '770101001', required: false })
  @IsOptional()
  @IsString()
  kpp?: string;

  @ApiProperty({ example: '1027700132195' })
  @IsString()
  ogrn: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CheckInnDto {
  @ApiProperty({ example: '7711223344' })
  @IsString()
  @Length(10, 12)
  inn: string;
}