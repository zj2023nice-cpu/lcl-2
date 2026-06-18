import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { HoldService } from './hold.service';
import { CreateHoldDto } from './dto/create-hold.dto';
import { UpdateHoldDto } from './dto/update-hold.dto';
import { BatchCreateHoldDto } from './dto/batch-create-hold.dto';
import { CsvHeaderMap } from './dto/batch-import-hold.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

const CSV_MAX_SIZE = 1 * 1024 * 1024;

const csvFileFilter = (req: any, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
  const allowedMimeTypes = ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel'];
  const allowedExtensions = ['.csv', '.txt'];
  const ext = (file.originalname || '').toLowerCase().slice(-4);
  
  const hasValidMime = allowedMimeTypes.includes(file.mimetype);
  const hasValidExt = allowedExtensions.some((e) => ext.endsWith(e));
  
  if (!hasValidMime && !hasValidExt) {
    return cb(new BadRequestException('仅支持 CSV 格式文件'), false);
  }
  cb(null, true);
};

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class HoldController {
  constructor(private readonly holdService: HoldService) {}

  @Get('routes/:routeId/holds')
  findAllByRoute(@Param('routeId', ParseIntPipe) routeId: number) {
    return this.holdService.findAllByRoute(routeId);
  }

  @Post('routes/:routeId/holds')
  @Roles(UserRole.SETTER)
  batchCreate(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Body() batchCreateHoldDto: BatchCreateHoldDto,
  ) {
    return this.holdService.batchCreate(routeId, batchCreateHoldDto.holds);
  }

  @Post('routes/:routeId/holds/import')
  @Roles(UserRole.SETTER)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    fileFilter: csvFileFilter,
    limits: { fileSize: CSV_MAX_SIZE },
  }))
  async batchImportCsv(
    @Param('routeId', ParseIntPipe) routeId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('请上传 CSV 文件');
    }

    let headerMap: CsvHeaderMap | undefined;
    if (body.headerMap) {
      try {
        headerMap = typeof body.headerMap === 'string'
          ? JSON.parse(body.headerMap)
          : body.headerMap;
      } catch {
        throw new BadRequestException('headerMap 格式无效，应为 JSON 字符串');
      }
    }

    const csvContent = file.buffer.toString('utf-8');
    return this.holdService.batchImportFromCsv(routeId, csvContent, headerMap);
  }

  @Put('holds/:id')
  @Roles(UserRole.SETTER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHoldDto: UpdateHoldDto,
  ) {
    return this.holdService.update(id, updateHoldDto);
  }

  @Delete('holds/:id')
  @Roles(UserRole.SETTER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.holdService.remove(id);
  }
}
