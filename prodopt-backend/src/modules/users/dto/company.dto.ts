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

// Добавь это в конец файла src/modules/users/dto/company.dto.ts
import { IsInt, Min } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 2, description: 'ID типа адреса (2-Фактический, 3-Склад)' })
  @IsInt()
  @Min(1)
  addressTypeId: number;

  @ApiProperty({ example: 'Россия' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: 'Москва' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Ленина' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: '10' })
  @IsString()
  @IsNotEmpty()
  house: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  apartment?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}