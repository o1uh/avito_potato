export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    unreadCount?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}