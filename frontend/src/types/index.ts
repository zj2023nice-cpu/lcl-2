export type Theme = 'light' | 'dark';

export type ThemeStrategy = 'system' | 'manual' | 'schedule';

export interface ThemeSchedule {
  lightStart: string;
  darkStart: string;
}

export interface ThemePreferences {
  strategy: ThemeStrategy;
  manualTheme: Theme;
  schedule: ThemeSchedule;
}

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
  bannedUntil?: string;
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

export interface TimeSegment {
  open: string;
  close: string;
}

export interface SpecialDate {
  date: string;
  isClosed: boolean;
  segments: TimeSegment[];
  note?: string;
}

export interface TemporaryClosure {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  message?: string;
  createdAt?: string;
}

export interface BusinessHoursConfig {
  id?: number;
  gymId: number;
  weeklySchedule: TimeSegment[][];
  specialDates: SpecialDate[];
  temporaryClosures: TemporaryClosure[];
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessCalendarDay {
  date: string;
  dayOfWeek: number;
  dayLabel: string;
  isToday: boolean;
  isOpen: boolean;
  isSpecial: boolean;
  specialNote: string | null;
  isTemporarilyClosed: boolean;
  segments: TimeSegment[];
  openLabel: string;
}

export interface BusinessStatus {
  isOpen: boolean;
  isTemporarilyClosed: boolean;
  closureMessage: string | null;
  currentSegment: TimeSegment | null;
  closesAt: string | null;
  closesAtLabel: string;
  nextOpenTime: string | null;
  nextOpenLabel: string;
  todaySegments: TimeSegment[];
  timezone: string;
  weeklyCalendar: BusinessCalendarDay[];
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
  isArchived: boolean;
  archiveReason?: string | null;
  archivedBy?: number | null;
  archivedAt?: string | null;
  restoredBy?: number | null;
  restoredAt?: string | null;
  archivedByName?: string;
  restoredByName?: string;
}

export interface RouteBatchFilters {
  type?: RouteType;
  grade?: string;
  status?: RouteStatus;
  color?: string;
  wallId?: number;
}

export interface BatchUpdateStatusPayload {
  status: RouteStatus;
  routeIds?: number[];
  filters?: RouteBatchFilters;
  includeArchived?: boolean;
}

export interface BatchStatusPreviewRoute {
  id: number;
  name: string;
  grade: string;
  color: string | null;
  type: RouteType;
  status: RouteStatus;
  wallId: number;
  wallName: string;
  setterId: number | null;
  setterName: string | null;
  isArchived: boolean;
}

export interface BatchStatusPreviewResult {
  total: number;
  routes: BatchStatusPreviewRoute[];
}

export interface BatchStatusFailure {
  routeId: number;
  routeName: string;
  reason: string;
}

export interface BatchStatusResult {
  success: boolean;
  total: number;
  successCount: number;
  failureCount: number;
  failures: BatchStatusFailure[];
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

export type BadgeRarity = 'common' | 'rare' | 'legendary';
export type BadgeCategory = 'climbing_frequency' | 'grade_achievement' | 'checkin_streak' | 'social_interaction' | 'special';
export type BadgeConditionType = 'total_ascents' | 'max_grade' | 'checkin_streak' | 'flash_count' | 'onsight_count' | 'total_comments' | 'total_likes' | 'routes_set' | 'gym_visits' | 'months_active';

export interface BadgeCondition {
  type: BadgeConditionType;
  value: number;
  operator: '>=' | '==' | '<=';
}

export interface Badge {
  id: number;
  code: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  conditions: BadgeCondition[];
  icon?: string;
  color: string;
  points: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserBadge {
  id: number;
  userId: number;
  badgeId: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
  notified: boolean;
  progressDetails?: Record<string, number>;
  createdAt: string;
  badge?: Badge;
}

export interface BadgeStats {
  total: number;
  unlocked: number;
  common: { total: number; unlocked: number };
  rare: { total: number; unlocked: number };
  legendary: { total: number; unlocked: number };
  totalPoints: number;
}

export interface BadgeProgressStats {
  totalAscents: number;
  maxGrade: number;
  flashCount: number;
  onsightCount: number;
  checkinStreak: number;
  totalComments: number;
  totalLikes: number;
  routesSet: number;
  gymVisits: number;
  monthsActive: number;
}

export interface BadgeCheckResult {
  newlyUnlocked: UserBadge[];
  allBadges: UserBadge[];
}

export interface BadgePosterData {
  badge: Badge;
  user: {
    name: string;
    totalPoints: number;
    unlockedCount: number;
  };
  unlockedAt: string;
  qrContent: string;
}

export interface BadgeShareData {
  badge: Badge;
  user: {
    id: number;
    name: string;
    totalPoints: number;
    unlockedCount: number;
  };
  unlockedAt: string;
  progress: number;
}

export interface FollowUser {
  id: number;
  name: string;
  role: UserRole;
  verifiedAt?: string;
  createdAt: string;
  isFollowing: boolean;
  isMutual: boolean;
}

export interface FollowStatus {
  isFollowing: boolean;
  isMutual: boolean;
  followingCount: number;
  followerCount: number;
}

export interface FollowListResponse {
  data: FollowUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FeedAscent {
  id: number;
  userId: number;
  userName: string;
  routeId: number;
  routeName: string;
  routeGrade: string;
  routeColor?: string | null;
  ascentType: AscentType;
  attempts: number;
  notes?: string | null;
  createdAt: string;
}

export interface FeedGroup {
  date: string;
  ascents: FeedAscent[];
}

export interface FeedResponse {
  data: FeedGroup[];
  hasMore: boolean;
  total: number;
}

export type WallAngle = 'slab' | 'vertical' | 'overhang' | 'roof';

export interface CompletionGroupItem {
  routeId: number;
  routeName: string;
  grade: string;
  wallAngle: string | null;
  wallName: string;
  attemptCount: number;
  successCount: number;
  fallCount: number;
  completionRate: number;
  fallPositions: { x: number; y: number; intensity: number }[];
}

export interface CompletionGroup {
  key: string;
  label: string;
  attemptCount: number;
  successCount: number;
  fallCount: number;
  completionRate: number;
  routes: CompletionGroupItem[];
}

export interface CompletionTrend {
  period: string;
  attemptCount: number;
  successCount: number;
  fallCount: number;
  completionRate: number;
}

export interface RouteCompletionAnalysis {
  groups: CompletionGroup[];
  trend: CompletionTrend[];
}

export interface ParsedRouteRow {
  lineNumber: number;
  name: string;
  type: string;
  grade: string;
  color: string;
  wallId: string;
  setterId: string;
  tags: string;
  length: string;
  openDate: string;
  plannedRemoveDate: string;
  holdX: string;
  holdY: string;
  holdType: string;
}

export interface ValidatedRouteRow {
  lineNumber: number;
  name: string;
  type: RouteType;
  grade: string;
  color?: string;
  wallId: number;
  setterId?: number;
  tags?: string[];
  length?: number;
  openDate?: string;
  plannedRemoveDate?: string;
  holdX?: number;
  holdY?: number;
  holdType?: string;
}

export interface RouteValidationFailure {
  lineNumber: number;
  row: ParsedRouteRow;
  reasons: string[];
}

export interface RouteHoldError {
  lineNumber: number;
  reasons: string[];
}

export interface RouteBatchImportParseResult {
  totalRows: number;
  validCount: number;
  failureCount: number;
  holdCount: number;
  holdErrors: RouteHoldError[];
  validRows: ValidatedRouteRow[];
  failures: RouteValidationFailure[];
  headers: string[];
  parsedRows: ParsedRouteRow[];
}

export interface RouteBatchImportConfirmPayload {
  wallId: number;
  rows: ValidatedRouteRow[];
}

export interface RouteBatchImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failureCount: number;
  createdHolds: number;
  createdRoutes: { id: number; name: string; grade: string; type: RouteType; wallId: number }[];
  failures: { lineNumber: number; reason: string }[];
}
