import { Controller, Get, Post, Body, Query, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';
import { CreateActivityDto, QueryActivityDto } from './dto/activities.dto.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Activities')
@Controller(['activities', 'api/activities'])
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new farm activity log' })
  create(@Body() createActivityDto: CreateActivityDto) {
    return this.activitiesService.create(createActivityDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of farm activities' })
  findAll(@Query() query: QueryActivityDto) {
    return this.activitiesService.findAll(query);
  }

  @Get('summary/:demplotId')
  @ApiOperation({ summary: 'Get summary of farm activities for a demplot' })
  getSummary(@Param('demplotId', ParseIntPipe) demplotId: number) {
    return this.activitiesService.getSummary(demplotId);
  }
}
