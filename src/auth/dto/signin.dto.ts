import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SigninDto {
  @ApiProperty({
    type: String,
    description: 'Email of the user',
    default: 'admin@email.com',
  })
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({
    type: String,
    description: 'User password',
    default: 'password1@D',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
