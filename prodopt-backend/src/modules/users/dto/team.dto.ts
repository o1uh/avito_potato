import { IsEmail, IsNotEmpty, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({ example: 'colleague@company.com', description: 'Email сотрудника' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Петр Петров', description: 'ФИО сотрудника' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 2, description: 'ID роли (1 - Админ, 2 - Менеджер)' })
  @IsInt()
  @Min(1)
  roleId: number;
}

export class ChangeRoleDto {
  @ApiProperty({ example: 1, description: 'Новый ID роли' })
  @IsInt()
  @Min(1)
  roleId: number;
}