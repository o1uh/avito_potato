import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'ООО "Ромашка"', description: 'Название компании' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: '7711223344', description: 'ИНН организации' })
  @IsString()
  @Length(10, 12)
  inn: string;

  @ApiProperty({ example: 'Иван Иванов', description: 'ФИО представителя' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email для входа' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123', description: 'Пароль' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '+79990000000', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}