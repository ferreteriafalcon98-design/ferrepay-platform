import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationStatus, NotificationType } from '@prisma/client';
import { prisma } from '@metylosa/db';

@Injectable()
export class NotificationsService {
  async send(userId: string, type: NotificationType, title: string, body: string, dedupKey: string, channel: NotificationChannel = NotificationChannel.PUSH) {
    const existing = await prisma.notification.findUnique({ where: { dedupKey } });
    if (existing) {
      return existing;
    }

    return prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        channel,
        dedupKey,
        status: NotificationStatus.SENT,
      },
    });
  }

  async list(userId?: string) {
    return prisma.notification.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
