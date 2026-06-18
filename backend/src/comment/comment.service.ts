import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In } from 'typeorm';
import { Comment, CommentStatus } from '../entities/comment.entity';
import { CommentLike } from '../entities/comment-like.entity';
import { CommentReport, ReportReason } from '../entities/comment-report.entity';
import { Route } from '../entities/route.entity';
import { User, UserRole } from '../entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ReportCommentDto } from './dto/report-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';

export type CommentWithUser = Omit<Comment, 'user' | 'reply_to_user' | 'parent' | 'replies' | 'route'> & {
  user?: { id: number; name: string };
  reply_to_user?: { id: number; name: string } | null;
  liked_by_current_user?: boolean;
  replies?: CommentWithUser[];
  total_reply_count?: number;
};

export interface CommentsResponse {
  data: CommentWithUser[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_more: boolean;
  total_comments: number;
}

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(CommentLike)
    private commentLikeRepository: Repository<CommentLike>,
    @InjectRepository(CommentReport)
    private commentReportRepository: Repository<CommentReport>,
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private async enrichComments(
    comments: Comment[],
    currentUserId: number | null,
  ): Promise<CommentWithUser[]> {
    if (comments.length === 0) return [];

    const userIds = new Set<number>();
    comments.forEach((c) => {
      userIds.add(c.user_id);
      if (c.reply_to_user_id) userIds.add(c.reply_to_user_id);
    });

    const users = await this.userRepository.find({
      where: { id: In([...userIds]) },
      select: ['id', 'name'],
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    let likedCommentIds: Set<number> = new Set();
    if (currentUserId) {
      const commentIds = comments.map((c) => c.id);
      const likes = await this.commentLikeRepository.find({
        where: {
          comment_id: In(commentIds),
          user_id: currentUserId,
        },
        select: ['comment_id'],
      });
      likedCommentIds = new Set(likes.map((l) => l.comment_id));
    }

    return comments.map((c) => {
      const commentWithUser: CommentWithUser = { ...c };
      commentWithUser.user = userMap.get(c.user_id) || { id: c.user_id, name: '未知用户' };
      commentWithUser.reply_to_user = c.reply_to_user_id
        ? userMap.get(c.reply_to_user_id) || { id: c.reply_to_user_id, name: '未知用户' }
        : null;
      commentWithUser.liked_by_current_user = likedCommentIds.has(c.id);
      return commentWithUser;
    });
  }

  async getComments(
    routeId: number,
    queryDto: QueryCommentsDto,
    currentUserId: number | null,
  ): Promise<CommentsResponse> {
    const route = await this.routeRepository.findOne({ where: { id: routeId } });
    if (!route) {
      throw new NotFoundException('线路不存在');
    }

    const { page = 1, limit = 10, reply_limit = 3 } = queryDto;
    const skip = (page - 1) * limit;

    const [parentComments, totalParents] = await this.commentRepository.findAndCount({
      where: {
        route_id: routeId,
        parent_id: IsNull(),
        status: CommentStatus.ACTIVE,
      },
      order: {
        like_count: 'DESC',
        created_at: 'DESC',
      },
      skip,
      take: limit,
    });

    const [, totalComments] = await this.commentRepository.findAndCount({
      where: {
        route_id: routeId,
        status: CommentStatus.ACTIVE,
      },
    });

    const parentIds = parentComments.map((c) => c.id);

    const replyCommentsMap = new Map<number, Comment[]>();
    const replyCountsMap = new Map<number, number>();

    for (const parentId of parentIds) {
      const [replies, totalReplies] = await this.commentRepository.findAndCount({
        where: {
          parent_id: parentId,
          status: CommentStatus.ACTIVE,
        },
        order: { created_at: 'ASC' },
        take: reply_limit,
      });
      replyCommentsMap.set(parentId, replies);
      replyCountsMap.set(parentId, totalReplies);
    }

    const allCommentsForEnrich: Comment[] = [...parentComments];
    replyCommentsMap.forEach((replies) => {
      allCommentsForEnrich.push(...replies);
    });

    const enriched = await this.enrichComments(allCommentsForEnrich, currentUserId);
    const enrichedMap = new Map(enriched.map((c) => [c.id, c]));

    const result: CommentWithUser[] = parentComments.map((pc) => {
      const parent = enrichedMap.get(pc.id)!;
      const replies = replyCommentsMap.get(pc.id) || [];
      (parent as any).replies = replies.map((r) => enrichedMap.get(r.id)!);
      (parent as any).total_reply_count = replyCountsMap.get(pc.id) || 0;
      return parent;
    });

    return {
      data: result,
      total: totalParents,
      page,
      limit,
      total_pages: Math.ceil(totalParents / limit),
      has_more: skip + limit < totalParents,
      total_comments: totalComments,
    };
  }

  async getReplies(
    commentId: number,
    queryDto: { page?: number; limit?: number },
    currentUserId: number | null,
  ) {
    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const parent = await this.commentRepository.findOne({ where: { id: commentId } });
    if (!parent) {
      throw new NotFoundException('评论不存在');
    }

    const [replies, total] = await this.commentRepository.findAndCount({
      where: {
        parent_id: commentId,
        status: CommentStatus.ACTIVE,
      },
      order: { created_at: 'ASC' },
      skip,
      take: limit,
    });

    const enriched = await this.enrichComments(replies, currentUserId);

    return {
      data: enriched,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      has_more: skip + limit < total,
    };
  }

  async createComment(
    routeId: number,
    userId: number,
    createDto: CreateCommentDto,
  ): Promise<CommentWithUser> {
    const route = await this.routeRepository.findOne({ where: { id: routeId } });
    if (!route) {
      throw new NotFoundException('线路不存在');
    }

    let parentComment: Comment | null = null;
    if (createDto.parent_id) {
      parentComment = await this.commentRepository.findOne({
        where: { id: createDto.parent_id, status: CommentStatus.ACTIVE },
      });
      if (!parentComment) {
        throw new BadRequestException('父评论不存在或已被删除');
      }
      if (parentComment.route_id !== routeId) {
        throw new BadRequestException('父评论不属于该线路');
      }
      if (parentComment.parent_id !== null) {
        throw new BadRequestException('仅支持二级嵌套回复');
      }
    }

    if (createDto.reply_to_user_id) {
      const replyToUser = await this.userRepository.findOne({
        where: { id: createDto.reply_to_user_id },
      });
      if (!replyToUser) {
        throw new BadRequestException('回复目标用户不存在');
      }
    }

    const comment = this.commentRepository.create({
      route_id: routeId,
      user_id: userId,
      content: createDto.content,
      parent_id: createDto.parent_id || null,
      reply_to_user_id: createDto.reply_to_user_id || null,
    });

    const saved = await this.commentRepository.save(comment);

    if (parentComment) {
      await this.commentRepository.increment(
        { id: parentComment.id },
        'reply_count',
        1,
      );
    }

    const enriched = await this.enrichComments([saved], userId);
    return enriched[0];
  }

  async updateComment(
    commentId: number,
    userId: number,
    userRole: UserRole,
    updateDto: UpdateCommentDto,
  ): Promise<CommentWithUser> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.status === CommentStatus.DELETED) {
      throw new BadRequestException('评论已被删除');
    }

    if (comment.user_id !== userId) {
      throw new ForbiddenException('无权修改他人评论');
    }

    comment.content = updateDto.content;
    const saved = await this.commentRepository.save(comment);

    const enriched = await this.enrichComments([saved], userId);
    return enriched[0];
  }

  async deleteComment(
    commentId: number,
    userId: number,
    userRole: UserRole,
  ): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.status === CommentStatus.DELETED) {
      return;
    }

    const isAdmin =
      userRole === UserRole.PLATFORM_ADMIN || userRole === UserRole.GYM_ADMIN;
    if (comment.user_id !== userId && !isAdmin) {
      throw new ForbiddenException('无权删除他人评论');
    }

    await this.commentRepository.update(commentId, {
      status: CommentStatus.DELETED,
      content: '[该评论已被删除]',
      deleted_at: new Date(),
      deleted_by: userId,
    });

    if (comment.parent_id) {
      await this.commentRepository.decrement(
        { id: comment.parent_id },
        'reply_count',
        1,
      );
    }
  }

  async toggleLike(
    commentId: number,
    userId: number,
  ): Promise<{ liked: boolean; like_count: number }> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });
    if (!comment || comment.status === CommentStatus.DELETED) {
      throw new NotFoundException('评论不存在或已被删除');
    }

    const existingLike = await this.commentLikeRepository.findOne({
      where: { comment_id: commentId, user_id: userId },
    });

    let liked: boolean;
    if (existingLike) {
      await this.commentLikeRepository.remove(existingLike);
      await this.commentRepository.decrement({ id: commentId }, 'like_count', 1);
      liked = false;
    } else {
      const like = this.commentLikeRepository.create({
        comment_id: commentId,
        user_id: userId,
      });
      await this.commentLikeRepository.save(like);
      await this.commentRepository.increment({ id: commentId }, 'like_count', 1);
      liked = true;
    }

    const updated = await this.commentRepository.findOne({ where: { id: commentId } });
    return { liked, like_count: updated?.like_count || 0 };
  }

  async reportComment(
    commentId: number,
    userId: number,
    reportDto: ReportCommentDto,
  ): Promise<{ success: boolean }> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });
    if (!comment || comment.status === CommentStatus.DELETED) {
      throw new NotFoundException('评论不存在或已被删除');
    }

    const existingReport = await this.commentReportRepository.findOne({
      where: { comment_id: commentId, user_id: userId },
    });

    if (existingReport) {
      return { success: true };
    }

    const report = this.commentReportRepository.create({
      comment_id: commentId,
      user_id: userId,
      reason: reportDto.reason,
      description: reportDto.description || null,
    });

    await this.commentReportRepository.save(report);
    await this.commentRepository.increment({ id: commentId }, 'report_count', 1);

    const updated = await this.commentRepository.findOne({ where: { id: commentId } });
    if (updated && updated.report_count >= 5) {
      await this.commentRepository.update(commentId, {
        status: CommentStatus.REPORTED,
      });
    }

    return { success: true };
  }

  async getUserCommentStats(userId: number): Promise<{
    total_comments: number;
    total_likes_received: number;
  }> {
    const [comments, commentCount] = await this.commentRepository.findAndCount({
      where: { user_id: userId, status: CommentStatus.ACTIVE },
    });

    const totalLikes = comments.reduce((sum, c) => sum + c.like_count, 0);

    return {
      total_comments: commentCount,
      total_likes_received: totalLikes,
    };
  }
}
