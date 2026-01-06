import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  CreditCard, 
  Minus, 
  Plus, 
  User, 
  MessageSquare,
  Check,
  Trash2
} from "lucide-react";
import { Notification, NotificationType } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "order_success":
      return <CheckCircle className="w-4 h-4 text-success" />;
    case "order_fail":
      return <XCircle className="w-4 h-4 text-destructive" />;
    case "order_create":
      return <CreditCard className="w-4 h-4 text-primary" />;
    case "credit_add":
      return <Plus className="w-4 h-4 text-success" />;
    case "credit_deduct":
      return <Minus className="w-4 h-4 text-warning" />;
    case "profile_update":
      return <User className="w-4 h-4 text-primary" />;
    case "admin_message":
      return <MessageSquare className="w-4 h-4 text-primary" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const getNotificationBg = (type: NotificationType) => {
  switch (type) {
    case "order_success":
    case "credit_add":
      return "bg-success/10";
    case "order_fail":
      return "bg-destructive/10";
    case "credit_deduct":
      return "bg-warning/10";
    default:
      return "bg-secondary";
  }
};

export const NotificationCenter = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}: NotificationCenterProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={onMarkAllAsRead}
              >
                <Check className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={onClearAll}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-secondary/50 cursor-pointer transition-colors ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-md ${getNotificationBg(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
