import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ReportCommentDto } from './dto/report-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('routes/:routeId/comments')
  @UseGuards(OptionalJwtAuthGuard)
  getComments(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Query() queryDto: QueryCommentsDto,
    @Request() req: any,
  ) {
    return this.commentService.getComments(routeId, queryDto, req.user?.id || null);
  }

  @Get('comments/:commentId/replies')
  @UseGuards(OptionalJwtAuthGuard)
  getReplies(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number,
    @Request() req?: any,
  ) {
    return this.commentService.getReplies(
      commentId,
      { page, limit },
      req.user?.id || null,
    );
  }

  @Post('routes/:routeId/comments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VERIFIED_CLIMBER, UserRole.SETTER, UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  createComment(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Body() createDto: CreateCommentDto,
    @Request() req: any,
  ) {
    return this.commentService.createComment(routeId, req.user.id, createDto);
  }

  @Put('comments/:commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VERIFIED_CLIMBER, UserRole.SETTER, UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  updateComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() updateDto: UpdateCommentDto,
    @Request() req: any,
  ) {
    return this.commentService.updateComment(
      commentId,
      req.user.id,
      req.user.role,
      updateDto,
    );
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VERIFIED_CLIMBER, UserRole.SETTER, UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  deleteComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req: any,
  ) {
    return this.commentService.deleteComment(
      commentId,
      req.user.id,
      req.user.role,
    );
  }

  @Post('comments/:commentId/like')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VERIFIED_CLIMBER, UserRole.SETTER, UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  toggleLike(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req: any,
  ) {
    return this.commentService.toggleLike(commentId, req.user.id);
  }

  @Post('comments/:commentId/report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VERIFIED_CLIMBER, UserRole.SETTER, UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  reportComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() reportDto: ReportCommentDto,
    @Request() req: any,
  ) {
    return this.commentService.reportComment(commentId, req.user.id, reportDto);
  }

  @Get('users/:userId/comments/stats')
  @UseGuards(JwtAuthGuard)
  getUserCommentStats(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.commentService.getUserCommentStats(userId);
  }
}
