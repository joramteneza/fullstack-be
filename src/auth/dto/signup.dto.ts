import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({
    type: String,
    description: 'Email of the user',
    default: 'admin@email.com',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    type: String,
    description:
      'User password (min of 6 characters, at least one uppercase letter, one lowercase letter and one number)',
    default: 'password1@D',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password: string;

  @ApiProperty({
    type: String,
    description: 'Username of the user',
    default: 'usertest',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    type: String,
    description: 'First name of the user',
    default: 'User',
  })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({
    type: String,
    description: 'Last name of the user',
    default: 'Test',
  })
  @IsNotEmpty()
  @IsString()
  lastName: string;
}
