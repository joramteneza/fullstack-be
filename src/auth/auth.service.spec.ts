import { Test, TestingModule } from '@nestjs/testing';
import moment from 'moment';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SigninDto } from './dto';
import { ForbiddenException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as argon from 'argon2';

describe('Auth Service', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        ConfigService,
        JwtService,
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('generateCode', () => {
    it('should generate a 6-digit code and a future expiration date', () => {
      const codeObject = authService.generateCode();

      expect(codeObject).toMatchObject({
        code: expect.stringMatching(/^\d{6}$/),
        expiration: expect.any(String),
      });

      const expirationDate = moment(codeObject.expiration);
      expect(expirationDate.isValid()).toBe(true);

      const minutesToAdd = 2;
      const expectedExpiration = moment().add(minutesToAdd, 'minutes');
      const differenceInMs = Math.abs(expirationDate.diff(expectedExpiration));
      expect(differenceInMs).toBeLessThanOrEqual(1000); // Check if expiration date is within 1 second of expected date
    });
  });

  describe('validateUser', () => {
    it('should return user when credentials are correct', async () => {
      const email = 'user@example.com';
      const password = 'password123';
      const user: User = {
        id: '1',
        email: 'example@gmail.com',
        hash: await argon.hash('password123'),
        organizationId: '1',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        mobileNumber: '1234567890',
        facebookId: null,
        googleId: null,
        isOrgOwner: false,
        emailOtp: null,
        xenditCustomerId: null,
        imageId: null,
        isActive: true,
        emailOtpExpiration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        hashedRt: null,
      };
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(user);

      const dto: SigninDto = { email, password };
      const result = await authService.validateUser(dto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: {
          organization: true,
          userRoles: { include: { role: true } },
        },
      });
      expect(result).toEqual(user);
    });

    it('should throw ForbiddenException when credentials are incorrect', async () => {
      const email = 'user@example.com';
      const password = 'password123';
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      const dto: SigninDto = { email, password };
      await expect(authService.validateUser(dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: {
          organization: true,
          userRoles: { include: { role: true } },
        },
      });
    });
  });
});
