export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface Notification {
  id: number;
  recipientId: number;
  title: string;
  message: string;
  type: NotificationType;
  entityType?: 'deal' | 'dispute' | 'ticket' | 'system' | 'offer' | null;
  entityId?: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  meta: {
    unreadCount: number;
  };
}