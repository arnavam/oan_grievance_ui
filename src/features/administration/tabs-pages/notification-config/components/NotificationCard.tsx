"use client";

import { NotificationRow } from './NotificationRow';
import { NotificationTemplate, PlaceholderItem, UpdateNotificationTemplatePayload, FlatRecipientOption } from './types';
import { useTranslations } from 'next-intl';

interface NotificationCardProps {
    notifications: NotificationTemplate[];
    onUpdate?: (templateName: string, payload: UpdateNotificationTemplatePayload) => Promise<void>;
    placeholders?: PlaceholderItem[];
    recipientOptions?: FlatRecipientOption[];
}

export function NotificationCard({ notifications, onUpdate, placeholders, recipientOptions }: NotificationCardProps) {
    const t = useTranslations('admin.notifications');
    
    if (notifications.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 font-medium">
                {t('noTemplatesFound')}
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {notifications.map((notification, index) => (
                <NotificationRow 
                    key={notification.name} 
                    notification={notification} 
                    isLast={index === notifications.length - 1} 
                    onUpdate={onUpdate}
                    placeholders={placeholders}
                    recipientOptions={recipientOptions}
                />
            ))}
        </div>
    );
}
