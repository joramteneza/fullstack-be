import { ChangePasswordDto } from './dto/change-password.dto';
import { ForbiddenException, Injectable } from '@nestjs/common';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from './../prisma/prisma.service';
import { SigninDto, SignupDto } from './dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Tokens } from './types';
import { UserRole } from '@prisma/client';

interface User {
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
}
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    try {
      const hash = await argon.hash(dto.password);

      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          username: dto.username,
          role: UserRole.USER,
          hash,
        },
      });

      delete user.hash;
      delete user.hashedRt;
      return user;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }
      throw error;
    }
  }

  async signin(dto: SigninDto, headers: any) {
    const user = await this.validateUser(dto);

    const tokens = await this.getTokens(user.id, user);
    await this.updateRtHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string): Promise<boolean> {
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        hashedRt: {
          not: null,
        },
      },
      data: {
        hashedRt: null,
      },
    });
    return true;
  }

  async refreshTokens(userId: string, rt: string): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user || !user.hashedRt) throw new ForbiddenException('Access Denied');

    // const rtMatches = await argon.verify(user.hashedRt, rt);
    // if (!rtMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id, user);
    await this.updateRtHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async validateUser(dto: SigninDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (!user) throw new ForbiddenException('Credentials incorrect');

    const pwdMatched = await argon.verify(user.hash, dto.password);
    if (!pwdMatched) throw new ForbiddenException('Credentials incorrect');
    return user;
  }

  async updateRtHash(userId: string, rt: string): Promise<void> {
    const hash = await argon.hash(rt);
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hashedRt: hash,
      },
    });
  }

  async getTokens(userId: string, user: User): Promise<Tokens> {
    const payload = {
      sub: userId,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    return {
      accessToken: await this.jwt.signAsync(payload, {
        expiresIn: '30m',
        secret: this.config.get('JWT_SECRET'),
      }),
      refreshToken: await this.jwt.signAsync(payload, {
        expiresIn: '7d',
        secret: this.config.get('JWT_RT_SECRET'),
      }),
    };
  }

  async changePassword(dto: ChangePasswordDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    await this.validateUser({
      email: user.email,
      password: dto.password,
    });

    const hash = await argon.hash(dto.newPassword);
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hash,
      },
    });
    return { message: 'Password has been successfully changed.' };
  }
}
