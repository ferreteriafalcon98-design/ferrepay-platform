import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DeviceTrust, NotificationChannel, NotificationStatus, NotificationType, OtpPurpose, RiskDecision, RiskSource, SecurityEventType, UserStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '@metylosa/db';
import { generateOtp, hashValue, nowPlusMinutes } from '@metylosa/shared-kernel';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class AuthService {
  constructor(private readonly walletService: WalletService) {}

  async registerStart(phone: string) {
    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, status: UserStatus.PENDING },
    });

    const otp = generateOtp();
    const challenge = await prisma.otpChallenge.create({
      data: {
        userId: user.id,
        purpose: OtpPurpose.REGISTER,
        otpHash: hashValue(otp),
        expiresAt: nowPlusMinutes(10),
      },
    });

    await prisma.securityEvent.create({
      data: { userId: user.id, type: SecurityEventType.REGISTER_STARTED },
    });
    await prisma.notification.upsert({
      where: { dedupKey: `otp-register:${challenge.id}` },
      update: {},
      create: {
        userId: user.id,
        type: NotificationType.OTP_SENT,
        channel: NotificationChannel.SMS,
        title: 'Código OTP enviado',
        body: 'Te enviamos un OTP para registro.',
        dedupKey: `otp-register:${challenge.id}`,
        status: NotificationStatus.SENT,
      },
    });

    return {
      challengeId: challenge.id,
      ...(process.env.NODE_ENV !== 'production' ? { otpPreview: otp } : {}),
    };
  }

  async registerVerify(challengeId: string, otp: string, deviceLabel: string, fingerprint: string) {
    const challenge = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.purpose !== OtpPurpose.REGISTER) throw new BadRequestException('Challenge invalid');

    const user = await this.verifyOtpChallenge(challengeId, otp);
    await prisma.user.update({ where: { id: user.id }, data: { status: UserStatus.ACTIVE } });
    const session = await this.createSession(user.id, user.phone, deviceLabel, fingerprint);

    await prisma.securityEvent.create({ data: { userId: user.id, type: SecurityEventType.REGISTER_VERIFIED } });
    await prisma.riskEvent.create({
      data: {
        userId: user.id,
        source: RiskSource.AUTH,
        businessRef: `auth:register:${user.id}`,
        score: 5,
        decision: RiskDecision.ALLOW,
      },
    });
    return session;
  }

  async loginStart(phone: string) {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('User unavailable');

    const otp = generateOtp();
    const challenge = await prisma.otpChallenge.create({
      data: {
        userId: user.id,
        purpose: OtpPurpose.LOGIN,
        otpHash: hashValue(otp),
        expiresAt: nowPlusMinutes(10),
      },
    });

    await prisma.securityEvent.create({ data: { userId: user.id, type: SecurityEventType.LOGIN_STARTED } });
    await prisma.notification.upsert({
      where: { dedupKey: `otp-login:${challenge.id}` },
      update: {},
      create: {
        userId: user.id,
        type: NotificationType.OTP_SENT,
        channel: NotificationChannel.SMS,
        title: 'Código OTP enviado',
        body: 'Te enviamos un OTP para login.',
        dedupKey: `otp-login:${challenge.id}`,
        status: NotificationStatus.SENT,
      },
    });
    return {
      challengeId: challenge.id,
      ...(process.env.NODE_ENV !== 'production' ? { otpPreview: otp } : {}),
    };
  }

  async loginVerify(challengeId: string, otp: string, deviceLabel: string, fingerprint: string) {
    const challenge = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.purpose !== OtpPurpose.LOGIN) throw new BadRequestException('Challenge invalid');

    const user = await this.verifyOtpChallenge(challengeId, otp);
    const session = await this.createSession(user.id, user.phone, deviceLabel, fingerprint);
    await prisma.securityEvent.create({ data: { userId: user.id, type: SecurityEventType.LOGIN_VERIFIED } });
    await prisma.riskEvent.create({
      data: {
        userId: user.id,
        source: RiskSource.AUTH,
        businessRef: `auth:login:${user.id}`,
        score: 5,
        decision: RiskDecision.ALLOW,
      },
    });
    return session;
  }

  async logout(userId: string, sessionId: string) {
    await prisma.session.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await prisma.securityEvent.create({ data: { userId, type: SecurityEventType.LOGOUT } });
    await prisma.businessEvent.create({ data: { userId, type: 'AUTH_LOGOUT', requestId: 'unknown' } });
    return { ok: true };
  }

  async refresh(sessionId: string, refreshToken: string) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) throw new UnauthorizedException('Session invalid');
    if (session.refreshTokenHash !== hashValue(refreshToken)) throw new UnauthorizedException('Token mismatch');

    const nextToken = randomUUID();
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: hashValue(nextToken),
        expiresAt: nowPlusMinutes(60 * 24 * 7),
      },
    });

    await prisma.securityEvent.create({ data: { userId: session.userId, type: SecurityEventType.SESSION_REFRESHED } });
    return { sessionId: session.id, refreshToken: nextToken };
  }

  private async verifyOtpChallenge(challengeId: string, otp: string) {
    const challenge = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new BadRequestException('Challenge missing');
    if (challenge.verifiedAt) throw new BadRequestException('Challenge already used');
    if (challenge.expiresAt < new Date()) throw new BadRequestException('OTP expired');
    if (challenge.attempts >= challenge.maxAttempts) throw new BadRequestException('OTP attempts exceeded');

    if (challenge.otpHash !== hashValue(otp)) {
      await prisma.otpChallenge.update({ where: { id: challengeId }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('OTP mismatch');
    }

    await prisma.otpChallenge.update({ where: { id: challengeId }, data: { verifiedAt: new Date() } });
    return prisma.user.findUniqueOrThrow({ where: { id: challenge.userId } });
  }

  private async createSession(userId: string, phone: string, label: string, fingerprint: string) {
    const device = await prisma.device.upsert({
      where: { userId_fingerprint: { userId, fingerprint } },
      update: { label, revokedAt: null, trustStatus: DeviceTrust.TRUSTED },
      create: { userId, label, fingerprint, trustStatus: DeviceTrust.TRUSTED },
    });

    const refreshToken = randomUUID();
    const session = await prisma.session.create({
      data: {
        userId,
        deviceId: device.id,
        refreshTokenHash: hashValue(refreshToken),
        expiresAt: nowPlusMinutes(60 * 24 * 7),
      },
    });

    await this.walletService.bootstrapPrimaryWallet(userId, phone, 'CO', 'COP');

    return { sessionId: session.id, userId, refreshToken };
  }
}
