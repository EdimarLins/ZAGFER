export enum ToolStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
}

export type ActionType = 'CHECKOUT' | 'RETURN' | 'RENEWAL';

export interface Tool {
  id: string;
  name: string;
  category: string;
  size?: string;
  bmp?: string; // Código de patrimônio ou identificação interna (Opcional)
  sector: string;
  status: ToolStatus;
}

export interface User {
  id: string;
  name: string;
  matricula: string;
  active: boolean;
  role: 'admin' | 'user';
  force_reset?: boolean;
}

export interface HistoryRecord {
  id: string;
  timestamp: number; // Unix timestamp
  actionType: ActionType;

  // Logged in user (Operator/Dispatcher)
  dispatcherId: string;
  dispatcherName: string;
  dispatcherMatricula: string;

  // Manual entry (Who took/returned the tool)
  responsibleName: string;
  responsibleMatricula: string;

  toolIds: string[];
  toolsSummary: string;

  // New field for deadline
  expectedReturnDate?: number;
}