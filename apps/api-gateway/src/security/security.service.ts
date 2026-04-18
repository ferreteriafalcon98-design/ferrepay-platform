import { BadRequestException, Injectable } from '@nestjs/common';
import { DeviceTrust, NotificationChannel, NotificationStatus, NotificationType, RiskDecision, RiskSource, SecurityEventType } from '@prisma/client';
import { prisma } from '@metylosa/db';
import { hashValue } from '@metylosa/shared-kernel';

@Injectable()
export class SecurityService {
  async overview(userId: string) {
    const [user, devices, sessions, events] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.device.count({ where: { userId, revokedAt: null } }),
      prisma.session.count({ where: { userId, revokedAt: null } }),
      prisma.securityEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    return {
      devices,
      sessions,
      hasPin: Boolean(user.pinHash),
      biometricEnabled: user.biometricEnabled,
      events,
    };
  }

  async setPin(userId: string, pin: string) {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new BadRequestException('PIN must be numeric and 4-6 digits');
    }

    await prisma.user.update({ where: { id: userId }, data: { pinHash: hashValue(pin) } });
    await prisma.securityEvent.create({ data: { userId, type: SecurityEventType.PIN_SET } });
    await prisma.riskEvent.create({
      data: {
        userId,
        source: RiskSource.SECURITY,
        businessRef: `security:pin:${userId}`,
        score: 10,
        decision: RiskDecision.ALLOW,
      },
    });
    return { ok: true };
  }

  async setBiometric(userId: string, enabled: boolean) {
    await prisma.user.update({ where: { id: userId }, data: { biometricEnabled: enabled } });
    await prisma.securityEvent.create({
      data: {
        userId,
        type: enabled ? SecurityEventType.BIOMETRIC_ENABLED : SecurityEventType.BIOMETRIC_DISABLED,
      },
    });
    return { enabled };
  }

  async devices(userId: string) {
    return prisma.device.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async revokeDevice(userId: string, deviceId: string) {
    const result = await prisma.device.updateMany({
      where: { id: deviceId, userId, revokedAt: null },
      data: { revokedAt: new Date(), trustStatus: DeviceTrust.REVOKED },
    });

    if (result.count === 0) {
      throw new BadRequestException('Device not active or not found');
    }

    await prisma.session.updateMany({ where: { userId, deviceId, revokedAt: null }, data: { revokedAt: new Date() } });
    await prisma.securityEvent.create({ data: { userId, type: SecurityEventType.DEVICE_REVOKED, metadata: { deviceId } } });
    await prisma.notification.upsert({
      where: { dedupKey: `security-device:${deviceId}` },
      update: {},
      create: {
        userId,
        type: NotificationType.SECURITY_ALERT,
        channel: NotificationChannel.PUSH,
        title: 'Alerta de seguridad',
        body: 'Se revocó un dispositivo de tu cuenta.',
        dedupKey: `security-device:${deviceId}`,
        status: NotificationStatus.SENT,
      },
    });
    return { ok: true };
  }

  async sessions(userId: string) {
    return prisma.session.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async revokeSession(userId: string, sessionId: string) {
    const result = await prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (result.count === 0) {
      throw new BadRequestException('Session not active or not found');
    }

    await prisma.securityEvent.create({ data: { userId, type: SecurityEventType.SESSION_REVOKED, metadata: { sessionId } } });
    await prisma.notification.upsert({
      where: { dedupKey: `security-session:${sessionId}` },
      update: {},
      create: {
        userId,
        type: NotificationType.SECURITY_ALERT,
        channel: NotificationChannel.PUSH,
        title: 'Alerta de seguridad',
        body: 'Se revocó una sesión de tu cuenta.',
        dedupKey: `security-session:${sessionId}`,
        status: NotificationStatus.SENT,
      },
    });
    return { ok: true };
  }
}
