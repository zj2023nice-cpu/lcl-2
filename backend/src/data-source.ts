import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Gym } from './entities/gym.entity';
import { Wall } from './entities/wall.entity';
import { Route } from './entities/route.entity';
import { Hold } from './entities/hold.entity';
import { RouteVersion } from './entities/route-version.entity';
import { Ascent } from './entities/ascent.entity';
import { GradeVote } from './entities/grade-vote.entity';
import { UserProfile } from './entities/user-profile.entity';
import { OperationLog } from './entities/operation-log.entity';
import { Comment } from './entities/comment.entity';
import { CommentLike } from './entities/comment-like.entity';
import { CommentReport } from './entities/comment-report.entity';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { UserFollow } from './entities/user-follow.entity';

export default new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'climberoot',
  database: 'climbing_db',
  entities: [
    User,
    Gym,
    Wall,
    Route,
    Hold,
    RouteVersion,
    Ascent,
    GradeVote,
    UserProfile,
    OperationLog,
    Comment,
    CommentLike,
    CommentReport,
    Badge,
    UserBadge,
    UserFollow,
  ],
  migrations: ['src/migrations/*.ts'],
});
