import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RoomMemberGuard } from './guards/room-member.guard.js';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createRoom(@Body() dto: CreateRoomDto, @CurrentUser('sub') userId: string) {
    return this.roomsService.createRoom(dto.participantId, userId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  listRooms(@CurrentUser('sub') userId: string) {
    return this.roomsService.listRooms(userId);
  }

  @Get(':roomId')
  @UseGuards(RoomMemberGuard)
  @HttpCode(HttpStatus.OK)
  getRoomDetails(@Param('roomId') roomId: string) {
    return this.roomsService.getRoomDetails(roomId);
  }
}
