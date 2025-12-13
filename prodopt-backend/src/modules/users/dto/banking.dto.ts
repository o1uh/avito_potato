import { IsString, IsNotEmpty, Length, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddBankAccountDto {
  @ApiProperty({ example: '044525225', description: 'БИК банка' })
  @IsString()
  @Length(9, 9)
  bankBik: string;

  @ApiProperty({ example: 'ПАО Сбербанк', description: 'Название банка' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({ example: '40702810400000000001', description: 'Расчетный счет' })
  @IsString()
  @Length(20, 20)
  checkingAccount: string;

  @ApiProperty({ example: '30101810400000000225', description: 'Корр. счет' })
  @IsString()
  @Length(20, 20)
  correspondentAccount: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}