import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route, RouteType } from '../entities/route.entity';
import { Wall } from '../entities/wall.entity';
import { Hold, HoldType } from '../entities/hold.entity';
import { User } from '../entities/user.entity';
import { Gym } from '../entities/gym.entity';
import { createCanvas, loadImage, Image, SKRSContext2D } from '@napi-rs/canvas';
import * as path from 'path';
import * as fs from 'fs';

const SHARE_IMAGE_SCALE = 2;
const INFO_PANEL_HEIGHT = 160;
const HOLD_RADIUS = 8;
const START_HOLD_RADIUS = 12;
const END_HOLD_RADIUS = 12;
const PATH_LINE_WIDTH = 4;

const ROUTE_TYPE_LABELS: Record<RouteType, string> = {
  [RouteType.BOULDER]: '抱石',
  [RouteType.LEAD]: '先锋',
  [RouteType.TOP_ROPE]: '顶绳',
  [RouteType.SPEED]: '速度',
};

interface ShareImageData {
  route: Route;
  wall: Wall;
  holds: Hold[];
  setter: User | null;
  gym: Gym | null;
}

interface BrightnessResult {
  isLight: boolean;
  textColor: string;
  strokeColor: string;
  overlayBg: string;
  overlayTextColor: string;
  gradeBadgeBg: string;
  gradeBadgeText: string;
}

export interface SocialMetadata {
  'og:title': string;
  'og:description': string;
  'og:image': string;
  'og:image:width': string;
  'og:image:height': string;
  'twitter:card': string;
  'twitter:title': string;
  'twitter:description': string;
  'twitter:image': string;
}

export interface ShareImageResult {
  imageBuffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  metadata: SocialMetadata;
}

@Injectable()
export class RouteShareService {
  private uploadDir: string;

  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(Wall)
    private wallRepository: Repository<Wall>,
    @InjectRepository(Hold)
    private holdRepository: Repository<Hold>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Gym)
    private gymRepository: Repository<Gym>,
  ) {
    this.uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
  }

  async generateShareImage(routeId: number, baseUrl: string): Promise<ShareImageResult> {
    const data = await this.fetchShareData(routeId);
    const wallImage = await this.loadWallImage(data.wall);

    const imgWidth = wallImage ? wallImage.width : 1200;
    const imgHeight = wallImage ? wallImage.height : 1600;

    const canvasWidth = imgWidth * SHARE_IMAGE_SCALE;
    const canvasHeight = (imgHeight + INFO_PANEL_HEIGHT) * SHARE_IMAGE_SCALE;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.scale(SHARE_IMAGE_SCALE, SHARE_IMAGE_SCALE);

    if (wallImage) {
      ctx.drawImage(wallImage, 0, 0, imgWidth, imgHeight);
    } else {
      ctx.fillStyle = '#2c2c3a';
      ctx.fillRect(0, 0, imgWidth, imgHeight);
    }

    const brightness = this.detectBrightness(ctx, imgWidth, imgHeight);

    this.drawRoutePath(ctx, data.holds, data.route.color, brightness, imgWidth, imgHeight);
    this.drawHolds(ctx, data.holds, data.route.color, brightness, imgWidth, imgHeight);
    this.drawInfoPanel(ctx, data, brightness, imgWidth, imgHeight);

    const imageBuffer = canvas.encodeSync('png');
    const metadata = this.buildSocialMetadata(data, baseUrl, canvasWidth, canvasHeight);

    return {
      imageBuffer,
      mimeType: 'image/png',
      width: canvasWidth,
      height: canvasHeight,
      metadata,
    };
  }

  async getShareMetadata(routeId: number, baseUrl: string): Promise<{ metadata: SocialMetadata; width: number; height: number }> {
    const data = await this.fetchShareData(routeId);

    const canvasWidth = 1200 * SHARE_IMAGE_SCALE;
    const canvasHeight = (1600 + INFO_PANEL_HEIGHT) * SHARE_IMAGE_SCALE;

    const metadata = this.buildSocialMetadata(data, baseUrl, canvasWidth, canvasHeight);

    return {
      metadata,
      width: canvasWidth,
      height: canvasHeight,
    };
  }

  private async fetchShareData(routeId: number): Promise<ShareImageData> {
    const route = await this.routeRepository.findOne({ where: { id: routeId } });
    if (!route) {
      throw new NotFoundException(`Route with id ${routeId} not found`);
    }

    const wall = await this.wallRepository.findOne({ where: { id: route.wall_id } });
    if (!wall) {
      throw new NotFoundException(`Wall with id ${route.wall_id} not found`);
    }

    const holds = await this.holdRepository.find({
      where: { route_id: routeId },
      order: { position_y: 'ASC' },
    });

    let setter: User | null = null;
    if (route.setter_id) {
      setter = await this.userRepository.findOne({ where: { id: route.setter_id } });
    }

    let gym: Gym | null = null;
    if (wall.gym_id) {
      gym = await this.gymRepository.findOne({ where: { id: wall.gym_id } });
    }

    return { route, wall, holds, setter, gym };
  }

  private async loadWallImage(wall: Wall): Promise<Image | null> {
    if (!wall.photo_url) {
      return null;
    }

    const localPath = this.resolveLocalImagePath(wall.photo_url);
    if (localPath && fs.existsSync(localPath)) {
      try {
        return await loadImage(localPath);
      } catch {
        return null;
      }
    }

    try {
      return await loadImage(wall.photo_url);
    } catch {
      return null;
    }
  }

  private resolveLocalImagePath(photoUrl: string): string | null {
    if (photoUrl.startsWith('/api/files/')) {
      const token = photoUrl.replace('/api/files/', '');
      const possibleDirs = ['images', 'videos', ''];
      for (const dir of possibleDirs) {
        const searchDir = dir ? path.join(this.uploadDir, dir) : this.uploadDir;
        if (fs.existsSync(searchDir)) {
          const files = fs.readdirSync(searchDir);
          const match = files.find((f) => f.includes(token.substring(0, 8)));
          if (match) {
            return path.join(searchDir, match);
          }
        }
      }
      return null;
    }

    if (photoUrl.startsWith('/uploads/')) {
      return path.resolve(photoUrl.replace(/^\//, ''));
    }

    if (photoUrl.startsWith('/') || photoUrl.startsWith('./') || photoUrl.startsWith('..')) {
      const resolved = path.resolve(photoUrl);
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }

    if (!photoUrl.startsWith('http')) {
      const directPath = path.join(this.uploadDir, 'images', path.basename(photoUrl));
      if (fs.existsSync(directPath)) {
        return directPath;
      }
      const altPath = path.join(this.uploadDir, path.basename(photoUrl));
      if (fs.existsSync(altPath)) {
        return altPath;
      }
    }

    return null;
  }

  private detectBrightness(ctx: SKRSContext2D, width: number, height: number): BrightnessResult {
    let totalLuminance = 0;
    let sampleCount = 0;

    const imageData = ctx.getImageData(0, 0, Math.min(width, 100), Math.min(height, 100));
    const data = imageData.data;

    const imgW = imageData.width;
    const imgH = imageData.height;
    const sStepX = Math.max(1, Math.floor(imgW / 30));
    const sStepY = Math.max(1, Math.floor(imgH / 30));

    for (let y = 0; y < imgH; y += sStepY) {
      for (let x = 0; x < imgW; x += sStepX) {
        const idx = (y * imgW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        totalLuminance += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        sampleCount++;
      }
    }

    const avgLuminance = sampleCount > 0 ? totalLuminance / sampleCount : 0.5;
    const isLight = avgLuminance > 0.5;

    return {
      isLight,
      textColor: isLight ? '#1a1a2e' : '#ffffff',
      strokeColor: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)',
      overlayBg: isLight
        ? 'rgba(255,255,255,0.92)'
        : 'rgba(26,26,46,0.92)',
      overlayTextColor: isLight ? '#1a1a2e' : '#f0f0f0',
      gradeBadgeBg: isLight ? '#1a1a2e' : '#ffffff',
      gradeBadgeText: isLight ? '#ffffff' : '#1a1a2e',
    };
  }

  private drawRoutePath(
    ctx: SKRSContext2D,
    holds: Hold[],
    routeColor: string | null,
    brightness: BrightnessResult,
    imgWidth: number,
    _imgHeight: number,
  ): void {
    if (holds.length < 2) {
      return;
    }

    const sortedHolds = [...holds].sort((a, b) => a.position_y - b.position_y);

    const strokeColor = routeColor || (brightness.isLight ? '#1a1a2e' : '#ffffff');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sortedHolds[0].position_x, sortedHolds[0].position_y);

    for (let i = 1; i < sortedHolds.length; i++) {
      const prev = sortedHolds[i - 1];
      const curr = sortedHolds[i];
      const cpx = (prev.position_x + curr.position_x) / 2;
      const cpy = (prev.position_y + curr.position_y) / 2;
      ctx.quadraticCurveTo(prev.position_x, prev.position_y, cpx, cpy);
    }

    const last = sortedHolds[sortedHolds.length - 1];
    ctx.lineTo(last.position_x, last.position_y);

    ctx.strokeStyle = brightness.strokeColor;
    ctx.lineWidth = PATH_LINE_WIDTH + 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = PATH_LINE_WIDTH;
    ctx.stroke();
    ctx.restore();
  }

  private drawHolds(
    ctx: SKRSContext2D,
    holds: Hold[],
    routeColor: string | null,
    brightness: BrightnessResult,
    _imgWidth: number,
    _imgHeight: number,
  ): void {
    const fillColor = routeColor || (brightness.isLight ? '#1a1a2e' : '#ffffff');

    for (const hold of holds) {
      const x = hold.position_x;
      const y = hold.position_y;

      ctx.save();

      if (hold.type === HoldType.START) {
        this.drawStartHold(ctx, x, y, fillColor, brightness);
      } else if (hold.type === HoldType.END) {
        this.drawEndHold(ctx, x, y, fillColor, brightness);
      } else {
        this.drawRegularHold(ctx, x, y, fillColor, brightness, hold.type === HoldType.FOOT);
      }

      ctx.restore();
    }
  }

  private drawStartHold(
    ctx: SKRSContext2D,
    x: number,
    y: number,
    fillColor: string,
    brightness: BrightnessResult,
  ): void {
    const r = START_HOLD_RADIUS;

    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = brightness.strokeColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.fillStyle = brightness.isLight ? '#ffffff' : '#1a1a2e';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', x, y);
  }

  private drawEndHold(
    ctx: SKRSContext2D,
    x: number,
    y: number,
    fillColor: string,
    brightness: BrightnessResult,
  ): void {
    const r = END_HOLD_RADIUS;

    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = brightness.strokeColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.fillStyle = brightness.isLight ? '#ffffff' : '#1a1a2e';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('E', x, y);
  }

  private drawRegularHold(
    ctx: SKRSContext2D,
    x: number,
    y: number,
    fillColor: string,
    brightness: BrightnessResult,
    isFoot: boolean,
  ): void {
    const r = isFoot ? HOLD_RADIUS - 2 : HOLD_RADIUS;

    ctx.beginPath();
    ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = brightness.strokeColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();

    if (isFoot) {
      ctx.beginPath();
      ctx.arc(x, y, r - 3, 0, Math.PI * 2);
      ctx.strokeStyle = brightness.isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawInfoPanel(
    ctx: SKRSContext2D,
    data: ShareImageData,
    brightness: BrightnessResult,
    imgWidth: number,
    imgHeight: number,
  ): void {
    const panelY = imgHeight;
    const panelHeight = INFO_PANEL_HEIGHT;

    ctx.save();

    ctx.fillStyle = brightness.overlayBg;
    ctx.fillRect(0, panelY, imgWidth, panelHeight);

    const separatorColor = brightness.isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)';
    ctx.strokeStyle = separatorColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, panelY);
    ctx.lineTo(imgWidth, panelY);
    ctx.stroke();

    const padding = 24;
    const contentY = panelY + padding;
    let currentX = padding;

    const gradeText = data.route.grade || '--';
    const gradeMetrics = ctx.measureText(gradeText);
    const gradeBadgeWidth = Math.max(60, gradeMetrics.width + 28);
    const gradeBadgeHeight = 36;
    const gradeBadgeY = contentY + 4;

    this.drawRoundRect(ctx, currentX, gradeBadgeY, gradeBadgeWidth, gradeBadgeHeight, 8);
    ctx.fillStyle = brightness.gradeBadgeBg;
    ctx.fill();

    ctx.fillStyle = brightness.gradeBadgeText;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(gradeText, currentX + gradeBadgeWidth / 2, gradeBadgeY + gradeBadgeHeight / 2);

    currentX += gradeBadgeWidth + 16;

    ctx.fillStyle = brightness.overlayTextColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(data.route.name, currentX, contentY + 6);

    const typeLabel = ROUTE_TYPE_LABELS[data.route.type] || data.route.type;
    const nameWidth = ctx.measureText(data.route.name).width;
    const typeX = currentX + nameWidth + 16;

    if (typeX + 50 < imgWidth - padding) {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = brightness.isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
      ctx.fillText(typeLabel, typeX, contentY + 10);
    }

    const detailY = contentY + gradeBadgeHeight + 16;
    ctx.font = '14px sans-serif';
    ctx.fillStyle = brightness.isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';

    const details: string[] = [];
    if (data.setter) {
      details.push('定线员: ' + data.setter.name);
    }
    if (data.gym) {
      details.push(data.gym.name);
    }
    if (data.wall) {
      details.push(data.wall.name);
    }
    if (data.route.open_date) {
      const dateStr = new Date(data.route.open_date).toLocaleDateString('zh-CN');
      details.push('开放日期: ' + dateStr);
    }

    const detailText = details.join('  |  ');
    ctx.fillText(detailText, padding, detailY);

    const brandY = panelY + panelHeight - padding - 8;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = brightness.isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'right';
    ctx.fillText('攀岩线路分享', imgWidth - padding, brandY);

    ctx.restore();
  }

  private drawRoundRect(
    ctx: SKRSContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }

  private buildSocialMetadata(
    data: ShareImageData,
    baseUrl: string,
    width: number,
    height: number,
  ): SocialMetadata {
    const routeName = data.route.name;
    const grade = data.route.grade || '--';
    const typeLabel = ROUTE_TYPE_LABELS[data.route.type] || data.route.type;
    const setterName = data.setter ? data.setter.name : '';
    const gymName = data.gym ? data.gym.name : '';

    const title = `${grade} ${typeLabel} - ${routeName}`;

    const descParts: string[] = [`难度 ${grade}`, typeLabel];
    if (setterName) {
      descParts.push('定线员: ' + setterName);
    }
    if (gymName) {
      descParts.push(gymName);
    }
    const description = descParts.join(' | ');

    const imageUrl = `${baseUrl}/api/routes/${data.route.id}/share-image.png`;

    return {
      'og:title': title,
      'og:description': description,
      'og:image': imageUrl,
      'og:image:width': String(width),
      'og:image:height': String(height),
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': imageUrl,
    };
  }
}
