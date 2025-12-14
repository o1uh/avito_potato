import { IsNumber, IsPositive, IsInt } from 'class-validator';

export class CreateEscrowDto {
  @IsInt()
  dealId: number;

  @IsNumber()
  @IsPositive()
  totalAmount: number;
}