import type { ApiResponse, User, AuthResponse, EmailLoginCredentials, PhoneLoginCredentials, RegisterCredentials, Gym, Wall, Route, PaginatedResponse, Ascent, GradeVote, Hold, RouteHeat, ColdRoute, SetterWorkload, ActiveUsersStats, UserBadge, BadgeStats, BadgeProgressStats, BadgeCheckResult, BadgePosterData, BadgeShareData, BatchUpdateStatusPayload, BatchStatusPreviewResult, BatchStatusResult, ThemePreferences } from '@/types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

function buildUrlWithParams(url: string, params?: Record<string, string | number | boolean>): string {
  if (!params || Object.keys(params).length === 0) return url;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

function setToken(token: string): void {
  localStorage.setItem('accessToken', token);
}

function removeToken(): void {
  localStorage.removeItem('accessToken');
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

function transformKeys<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) {
    return obj.map(item => transformKeys<unknown>(item)) as T;
  }
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key);
      result[camelKey] = transformKeys(value);
    }
    return result as T;
  }
  return obj as T;
}

function transformToSnakeCase<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) {
    return obj.map(item => transformToSnakeCase<unknown>(item)) as T;
  }
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = transformToSnakeCase(value);
    }
    return result as T;
  }
  return obj as T;
}

interface RequestInterceptor {
  (options: RequestOptions): RequestOptions | Promise<RequestOptions>;
}

const requestInterceptors: RequestInterceptor[] = [];

function addRequestInterceptor(interceptor: RequestInterceptor): void {
  requestInterceptors.push(interceptor);
}

addRequestInterceptor((options) => {
  const token = getToken();
  if (token) {
    return {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    };
  }
  return options;
});

async function applyRequestInterceptors(options: RequestOptions): Promise<RequestOptions> {
  let result = options;
  for (const interceptor of requestInterceptors) {
    result = await interceptor(result);
  }
  return result;
}

async function request<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  try {
    const { params, ...restOptions } = options;
    const fullUrl = buildUrlWithParams(`${BASE_URL}${url}`, params);

    const processedOptions = await applyRequestInterceptors({
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...restOptions.headers,
      },
    });

    const response = await fetch(fullUrl, processedOptions);

    if (!response.ok) {
      let errorData: ApiResponse | null = null;
      try {
        errorData = await response.json();
      } catch {
        // ignore parse error
      }
      if (response.status === 401) {
        removeToken();
      }
      throw errorData || new Error(`HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const rawData = await response.json() as unknown;
    return transformKeys<T>(rawData);
  } catch (error) {
    throw error;
  }
}

function get<T = unknown>(url: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
  return request<T>(url, { ...options, method: 'GET' });
}

function post<T = unknown>(url: string, data?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  const snakeData = data ? transformToSnakeCase(data) : undefined;
  return request<T>(url, {
    ...options,
    method: 'POST',
    body: snakeData ? JSON.stringify(snakeData) : undefined,
  });
}

function put<T = unknown>(url: string, data?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  const snakeData = data ? transformToSnakeCase(data) : undefined;
  return request<T>(url, {
    ...options,
    method: 'PUT',
    body: snakeData ? JSON.stringify(snakeData) : undefined,
  });
}

function patch<T = unknown>(url: string, data?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  const snakeData = data ? transformToSnakeCase(data) : undefined;
  return request<T>(url, {
    ...options,
    method: 'PATCH',
    body: snakeData ? JSON.stringify(snakeData) : undefined,
  });
}

function del<T = unknown>(url: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
  return request<T>(url, { ...options, method: 'DELETE' });
}

function transformAuthResponse(raw: { user: Record<string, unknown>; accessToken: string; refreshToken: string }): AuthResponse {
  const transformedUser = transformKeys<User>(raw.user);
  return {
    user: transformedUser,
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
  };
}

export const authApi = {
  loginWithEmail: async (credentials: EmailLoginCredentials): Promise<AuthResponse> => {
    const raw = await post<{ user: Record<string, unknown>; accessToken: string; refreshToken: string }>('/auth/login', credentials);
    return transformAuthResponse(raw);
  },

  loginWithPhone: async (credentials: PhoneLoginCredentials): Promise<AuthResponse> => {
    const raw = await post<{ user: Record<string, unknown>; accessToken: string; refreshToken: string }>('/auth/login', credentials);
    return transformAuthResponse(raw);
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const raw = await post<{ user: Record<string, unknown>; accessToken: string; refreshToken: string }>('/auth/register', credentials);
    return transformAuthResponse(raw);
  },

  getProfile: async (): Promise<User> => {
    return get<User>('/auth/profile');
  },

  logout: async (): Promise<void> => {
    try {
      await post<void>('/auth/logout');
    } catch {
      // ignore logout errors
    }
  },
};

export const gymApi = {
  getGyms: async (): Promise<Gym[]> => {
    return get<Gym[]>('/gyms');
  },

  getGymById: async (id: number): Promise<Gym> => {
    return get<Gym>(`/gyms/${id}`);
  },
};

export const wallApi = {
  getWalls: async (gymId: number): Promise<Wall[]> => {
    return get<Wall[]>(`/gyms/${gymId}/walls`);
  },

  getWallById: async (id: number): Promise<Wall> => {
    return get<Wall>(`/walls/${id}`);
  },
};

export const routeApi = {
  getRoutes: async (wallId: number, filters?: { type?: string; grade?: string; status?: string; includeArchived?: boolean }): Promise<Route[]> => {
    return get<Route[]>(`/walls/${wallId}/routes`, { params: filters });
  },

  getRouteById: async (id: number): Promise<Route> => {
    return get<Route>(`/routes/${id}`);
  },

  canEditRoute: async (id: number): Promise<{ canEdit: boolean }> => {
    return get<{ canEdit: boolean }>(`/routes/${id}/can-edit`);
  },

  createRoute: async (wallId: number, routeData: Partial<Route>): Promise<Route> => {
    return post<Route>(`/walls/${wallId}/routes`, routeData);
  },

  updateRoute: async (id: number, routeData: Partial<Route>): Promise<Route> => {
    return put<Route>(`/routes/${id}`, routeData);
  },

  deleteRoute: async (id: number): Promise<void> => {
    return del<void>(`/routes/${id}`);
  },

  archiveRoute: async (id: number, reason: string): Promise<Route> => {
    return patch<Route>(`/routes/${id}/archive`, { reason });
  },

  restoreRoute: async (id: number): Promise<Route> => {
    return patch<Route>(`/routes/${id}/restore`, {});
  },

  getArchivedRoutes: async (filters?: { reason?: string; startDate?: string; endDate?: string; archivedBy?: number; wallId?: number }): Promise<Route[]> => {
    return get<Route[]>('/archived-routes', { params: filters });
  },

  batchStatusPreview: async (payload: BatchUpdateStatusPayload): Promise<BatchStatusPreviewResult> => {
    return post<BatchStatusPreviewResult>('/routes/batch/status/preview', payload);
  },

  batchUpdateStatus: async (payload: BatchUpdateStatusPayload): Promise<BatchStatusResult> => {
    return patch<BatchStatusResult>('/routes/batch/status', payload);
  },
};

export const ascentApi = {
  getAscents: async (filters?: { route_id?: number; user_id?: number; start_date?: string; end_date?: string }): Promise<Ascent[]> => {
    return get<Ascent[]>('/ascents', { params: filters });
  },

  getAscentById: async (id: number): Promise<Ascent> => {
    return get<Ascent>(`/ascents/${id}`);
  },

  createAscent: async (ascentData: Partial<Ascent>): Promise<Ascent> => {
    return post<Ascent>('/ascents', ascentData);
  },
};

export const voteApi = {
  getVotes: async (routeId: number): Promise<GradeVote[]> => {
    const data = await get<{ votes: GradeVote[]; distribution: Record<string, number>; consensus_grade: string | null; is_controversial: boolean; total_votes: number }>(`/routes/${routeId}/votes`);
    return Array.isArray(data) ? data : (data.votes || []);
  },
  submitVote: async (routeId: number, grade: string): Promise<GradeVote> => {
    return post<GradeVote>(`/routes/${routeId}/vote`, { suggestedGrade: grade });
  },
};

export const holdApi = {
  getHolds: async (routeId: number): Promise<Hold[]> => {
    return get<Hold[]>(`/routes/${routeId}/holds`);
  },

  createHolds: async (routeId: number, holds: Partial<Hold>[]): Promise<Hold[]> => {
    return post<Hold[]>(`/routes/${routeId}/holds`, holds);
  },

  updateHold: async (id: number, holdData: Partial<Hold>): Promise<Hold> => {
    return put<Hold>(`/holds/${id}`, holdData);
  },

  deleteHold: async (id: number): Promise<void> => {
    return del<void>(`/holds/${id}`);
  },
};

export const analyticsApi = {
  getRouteHeat: async (gymId: number): Promise<RouteHeat[]> => {
    return get<RouteHeat[]>(`/gyms/${gymId}/stats/route-heat`);
  },

  getColdRoutes: async (gymId: number): Promise<ColdRoute[]> => {
    return get<ColdRoute[]>(`/gyms/${gymId}/stats/cold-routes`);
  },

  getSetterWorkload: async (gymId: number, month?: string): Promise<SetterWorkload[]> => {
    return get<SetterWorkload[]>(`/gyms/${gymId}/stats/setter-work`, { params: month ? { month } : undefined });
  },

  getActiveUsers: async (gymId: number): Promise<ActiveUsersStats> => {
    return get<ActiveUsersStats>(`/gyms/${gymId}/stats/active-users`);
  },
};

export const userApi = {
  getGymUsers: async (gymId: number, filters?: { role?: string; verified?: boolean; search?: string }): Promise<User[]> => {
    const params: Record<string, string | number | boolean> = {};
    if (filters?.role) params.role = filters.role;
    if (filters?.verified !== undefined) params.verified = String(filters.verified);
    if (filters?.search) params.search = filters.search;
    return get<User[]>(`/gyms/${gymId}/users`, { params: Object.keys(params).length > 0 ? params : undefined });
  },

  getPendingVerifications: async (gymId: number): Promise<User[]> => {
    return get<User[]>(`/gyms/${gymId}/pending-verifications`);
  },

  verifyUser: async (userId: number, approved: boolean, reason?: string): Promise<User> => {
    return patch<User>(`/users/${userId}/verify`, { approved, reason });
  },

  changeUserRole: async (userId: number, role: string): Promise<User> => {
    return patch<User>(`/users/${userId}/role`, { role });
  },

  banUser: async (userId: number, banned: boolean, durationHours?: number): Promise<User> => {
    return patch<User>(`/users/${userId}/ban`, { banned, durationHours });
  },
};

export const profileApi = {
  getPyramid: async (): Promise<unknown> => {
    return get('/analytics/pyramid');
  },

  getProgress: async (): Promise<unknown> => {
    return get('/analytics/progress');
  },

  getStyleAnalysis: async (): Promise<unknown> => {
    return get('/analytics/style');
  },

  getCalibration: async (userId: number): Promise<unknown> => {
    return get(`/users/${userId}/calibration`);
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    return put<User>('/auth/profile', data);
  },

  getAscentCalendar: async (userId: number, month: string): Promise<unknown> => {
    return get(`/users/${userId}/ascent-calendar`, { params: { month } });
  },

  getThemePreferences: async (): Promise<ThemePreferences | null> => {
    try {
      return get<ThemePreferences>('/auth/theme-preferences');
    } catch {
      return null;
    }
  },

  updateThemePreferences: async (preferences: ThemePreferences): Promise<ThemePreferences> => {
    return put<ThemePreferences>('/auth/theme-preferences', preferences);
  },
};

import type { Comment, PaginatedComments, ReportReason } from '@/types';

export const commentApi = {
  getComments: async (
    routeId: number,
    params?: { page?: number; limit?: number; replyLimit?: number },
  ): Promise<PaginatedComments> => {
    return get<PaginatedComments>(`/routes/${routeId}/comments`, { params });
  },

  getReplies: async (
    commentId: number,
    params?: { page?: number; limit?: number },
  ): Promise<PaginatedComments> => {
    return get<PaginatedComments>(`/comments/${commentId}/replies`, { params });
  },

  createComment: async (
    routeId: number,
    data: { content: string; parentId?: number; replyToUserId?: number },
  ): Promise<Comment> => {
    return post<Comment>(`/routes/${routeId}/comments`, data);
  },

  updateComment: async (commentId: number, content: string): Promise<Comment> => {
    return put<Comment>(`/comments/${commentId}`, { content });
  },

  deleteComment: async (commentId: number): Promise<void> => {
    return del<void>(`/comments/${commentId}`);
  },

  toggleLike: async (commentId: number): Promise<{ liked: boolean; likeCount: number }> => {
    return post<{ liked: boolean; likeCount: number }>(`/comments/${commentId}/like`);
  },

  reportComment: async (
    commentId: number,
    reason: ReportReason,
    description?: string,
  ): Promise<{ success: boolean }> => {
    return post<{ success: boolean }>(`/comments/${commentId}/report`, {
      reason,
      description,
    });
  },

  getUserCommentStats: async (
    userId: number,
  ): Promise<{ totalComments: number; totalLikesReceived: number }> => {
    return get<{ totalComments: number; totalLikesReceived: number }>(
      `/users/${userId}/comments/stats`,
    );
  },
};

export const badgeApi = {
  getMyBadges: async (): Promise<{ badges: UserBadge[]; stats: BadgeStats }> => {
    const response = await get<{ success: boolean; data: { badges: UserBadge[]; stats: BadgeStats } }>('/badges/me');
    return response.data;
  },

  checkAndUnlockBadges: async (): Promise<BadgeCheckResult> => {
    const response = await post<{ success: boolean; data: BadgeCheckResult }>('/badges/check');
    return response.data;
  },

  getBadgeStats: async (): Promise<BadgeProgressStats> => {
    const response = await get<{ success: boolean; data: BadgeProgressStats }>('/badges/stats');
    return response.data;
  },

  getUserBadges: async (userId: number): Promise<{ badges: UserBadge[]; stats: BadgeStats }> => {
    const response = await get<{ success: boolean; data: { badges: UserBadge[]; stats: BadgeStats } }>(`/badges/user/${userId}`);
    return response.data;
  },

  markBadgeNotified: async (badgeId: number): Promise<void> => {
    await post(`/badges/${badgeId}/notify`);
  },

  getBadgePosterData: async (badgeId: number): Promise<BadgePosterData> => {
    const response = await get<{ success: boolean; data: BadgePosterData }>(`/badges/${badgeId}/poster`);
    return response.data;
  },

  getSharedBadge: async (shareId: number): Promise<BadgeShareData> => {
    const response = await get<{ success: boolean; data: BadgeShareData }>(`/badges/share/${shareId}`);
    return response.data;
  },
};

export const api = {
  request,
  get,
  post,
  put,
  patch,
  del,
  getToken,
  setToken,
  removeToken,
  addRequestInterceptor,
};

export default api;
