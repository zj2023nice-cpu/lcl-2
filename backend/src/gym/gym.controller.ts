import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { GymService } from './gym.service';
import { BusinessHoursService } from './business-hours.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';
import { UpdateBusinessHoursDto } from './dto/business-hours.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('gyms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GymController {
  constructor(
    private readonly gymService: GymService,
    private readonly businessHoursService: BusinessHoursService,
  ) {}

  @Get()
  findAll() {
    return this.gymService.findAll();
  }

  @Get(':id/business-status')
  getBusinessStatus(@Param('id', ParseIntPipe) id: number) {
    return this.businessHoursService.getStatus(id);
  }

  @Get(':id/business-hours')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GYM_ADMIN)
  getBusinessHours(@Param('id', ParseIntPipe) id: number) {
    return this.businessHoursService.getConfig(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gymService.findOne(id);
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN)
  create(@Body() createGymDto: CreateGymDto) {
    return this.gymService.create(createGymDto);
  }

  @Put(':id/business-hours')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GYM_ADMIN)
  updateBusinessHours(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessHoursDto,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
  ) {
    return this.businessHoursService.updateConfig(id, dto, user);
  }

  @Put(':id')
  @Roles(UserRole.GYM_ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGymDto: UpdateGymDto,
  ) {
    return this.gymService.update(id, updateGymDto);
  }
}
