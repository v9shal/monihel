
export interface User {
  id: number;
  email: string;
  name: string | null;
  password: string;
  createdAt: string;
  updatedAt: string;
  endpoints?: Endpoint[];
  notificationChannels?: NotificationChannel[];
}

export interface Endpoint {
  id: number;
  name: string;
  url: string;
  isActive: boolean;
  checkIntervalSec: number;
  createdAt: string;
  updatedAt: string;
  consecutiveFails: number;
  alertOnConsecutiveFails: number;
  isMuted: boolean;
  userId: number | null;
  user?: User;
  metrics?: EndpointMetric[];
  alerts?: Alert[];
  _count?: {
    metrics: number;
    alerts: number;
  };
  latestStatus?: PingStatus;
  latestResponseTime?: number;
  latestTimestamp?: string;
}

export interface EndpointMetric {
  timestamp: string;
  responseTimeMs: number;
  statusCode: number;
  status: PingStatus;
  endpointId: number;
  endpoint?: Endpoint;
}

export interface Alert {
  id: number;
  status: AlertStatus;
  createdAt: string;
  resolvedAt: string | null;
  message: string | null;
  endpointId: number;
  endpoint?: Endpoint;
}

export interface NotificationChannel {
  id: number;
  type: NotificationType;
  target: string;
  isDefault: boolean;
  userId: number;
  user?: User;
}

export enum PingStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  TIMEOUT = 'TIMEOUT'
}

export enum AlertStatus {
  TRIGGERED = 'TRIGGERED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED'
}

export enum NotificationType {
  EMAIL = 'EMAIL',
  WEBHOOK = 'WEBHOOK'
}