export type UserRole = 'platform_admin' | 'gym_admin' | 'setter' | 'verified_climber' | 'guest';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  gymId?: number;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Gym {
  id: number;
  name: string;
  address?: string;
  areaSqm?: number;
  adminId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Wall {
  id: number;
  gymId: number;
  name: string;
  description?: string;
  photoUrl?: string;
  polygonCoords?: object;
  createdAt: string;
  updatedAt: string;
}

export type RouteStatus = 'drafting' | 'open' | 'removing' | 'removed';
export type RouteType = 'boulder' | 'lead' | 'top_rope' | 'speed';

export interface Route {
  id: number;
  wallId: number;
  name: string;
  grade: string;
  color?: string;
  type: RouteType;
  status: RouteStatus;
  setterId?: number;
  setterName?: string;
  pathCoords?: object;
  tags?: string[];
  length?: number;
  description?: string;
  openDate?: string;
  plannedRemoveDate?: string;
  holds: Hold[];
  ascentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Hold {
  id: number;
  routeId: number;
  type: HoldType;
  positionX: number;
  positionY: number;
}

export type HoldType = 'hand' | 'foot' | 'start' | 'end';

export type AscentType = 'flash' | 'redpoint' | 'onsight' | 'high_point' | 'fall';

export interface Ascent {
  id: number;
  userId: number;
  routeId: number;
  ascentType: AscentType;
  attempts: number;
  feltGrade?: string;
  videoUrl?: string;
  notes?: string;
  visibility?: 'private' | 'friends' | 'public';
  routeName?: string;
  routeGrade?: string;
  userName?: string;
  route?: Route;
  createdAt: string;
}

export interface GradeVote {
  id: number;
  userId: number;
  routeId: number;
  suggestedGrade: string;
  createdAt: string;
}

export interface EmailLoginCredentials {
  email: string;
  password: string;
}

export interface PhoneLoginCredentials {
  phone: string;
  password: string;
}

export type LoginCredentials = EmailLoginCredentials | PhoneLoginCredentials;

export interface RegisterCredentials {
  name: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface SendCodeResponse {
  success: boolean;
  message: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface RouteHeat {
  routeId: number;
  routeName: string;
  grade: string;
  totalAscents: number;
  sentCount: number;
  sendRate: number;
}

export interface ColdRoute {
  routeId: number;
  routeName: string;
  grade: string;
  daysSinceLastAscent: number;
  openDate: string | null;
}

export interface SetterWorkload {
  setterId: number;
  setterName: string;
  routesSet: number;
}

export interface ActiveUsersStats {
  weeklyActiveUsers: number;
  totalMembers: number;
  avgRoutesPerUser: number;
}

export type TimerState = 'idle' | 'running' | 'paused' | 'finished';

export interface TimerSegment {
  id: string;
  routeId: number;
  routeName?: string;
  routeGrade?: string;
  routeColor?: string;
  startTime: number;
  endTime: number;
  duration: number;
  index: number;
}

export interface RestInterval {
  id: string;
  previousSegmentId: string;
  nextSegmentId: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface TimerResult {
  totalDuration: number;
  totalClimbTime: number;
  totalRestTime: number;
  segments: TimerSegment[];
  restIntervals: RestInterval[];
  restStats: {
    count: number;
    averageRest: number;
    shortestRest: number;
    longestRest: number;
  };
  startedAt: number;
  endedAt: number;
}

export interface UseClimbTimerOptions {
  onFinish?: (result: TimerResult) => void;
  onSegmentAdd?: (segment: TimerSegment, allSegments: TimerSegment[]) => void;
}

export type MessageType = 'success' | 'error' | 'warning' | 'loading';

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  duration?: number;
  createdAt: number;
  mergedCount: number;
}

export interface MessageContextType {
  messages: Message[];
  success: (content: string, duration?: number) => string;
  error: (content: string, duration?: number) => string;
  warning: (content: string, duration?: number) => string;
  loading: (content: string, duration?: number) => string;
  remove: (id: string) => void;
  clearAll: () => void;
}

export type SortField = 'grade' | 'createdAt' | 'ascentCount' | 'avgRating' | 'setterRating';
export type SortDirection = 'asc' | 'desc';

export interface SortCriterion {
  id: string;
  field: SortField;
  direction: SortDirection;
}

export interface SortPreset {
  id: string;
  name: string;
  criteria: SortCriterion[];
  createdAt: number;
}

export interface SortFieldOption {
  value: SortField;
  label: string;
  icon: string;
}

export interface AdvancedSortProps {
  criteria: SortCriterion[];
  onChange: (criteria: SortCriterion[]) => void;
  onReset: () => void;
  onClearFilters?: () => void;
}

export type CommentStatus = 'active' | 'deleted' | 'reported';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'false_info' | 'other';

export interface Comment {
  id: number;
  routeId: number;
  userId: number;
  content: string;
  parentId: number | null;
  replyToUserId: number | null;
  likeCount: number;
  replyCount: number;
  reportCount: number;
  status: CommentStatus;
  deletedAt: string | null;
  deletedBy: number | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; name: string };
  replyToUser?: { id: number; name: string } | null;
  likedByCurrentUser?: boolean;
  replies?: Comment[];
  totalReplyCount?: number;
}

export interface PaginatedComments {
  data: Comment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  totalComments: number;
}
