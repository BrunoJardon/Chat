import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { CreateRoomRequest, RoomDetail } from '@chat/types';
import { RoomsController } from './rooms.controller.js';
import type { RoomsService } from './rooms.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PARTICIPANT_ID = '22222222-2222-4222-8222-222222222222';
const ROOM_ID = '33333333-3333-4333-8333-333333333333';

function makeRoomsService() {
  return {
    createRoom: vi.fn(),
    getRoomDetails: vi.fn(),
  };
}

const roomDetail: RoomDetail = {
  id: ROOM_ID,
  type: 'private',
  participants: [
    { id: USER_ID, name: 'Ada' },
    { id: PARTICIPANT_ID, name: 'Grace' },
  ],
};

describe('RoomsController', () => {
  let roomsService: ReturnType<typeof makeRoomsService>;
  let controller: RoomsController;

  beforeEach(() => {
    roomsService = makeRoomsService();
    controller = new RoomsController(roomsService as unknown as RoomsService);
  });

  describe('POST /rooms', () => {
    it('delegates the participant id and the token subject to createRoom', async () => {
      const dto: CreateRoomRequest = { participantId: PARTICIPANT_ID };
      roomsService.createRoom.mockResolvedValue(roomDetail);

      const result = await controller.createRoom(dto, USER_ID);

      expect(roomsService.createRoom).toHaveBeenCalledWith(PARTICIPANT_ID, USER_ID);
      expect(result).toBe(roomDetail);
    });

    it('propagates 400 SELF_PARTICIPANT untouched', async () => {
      roomsService.createRoom.mockRejectedValue(new BadRequestException('SELF_PARTICIPANT'));

      const promise = controller.createRoom({ participantId: USER_ID }, USER_ID);

      await expect(promise).rejects.toBeInstanceOf(BadRequestException);
      await expect(promise).rejects.toThrow('SELF_PARTICIPANT');
    });

    it('propagates 404 USER_NOT_FOUND untouched', async () => {
      roomsService.createRoom.mockRejectedValue(new NotFoundException('USER_NOT_FOUND'));

      const promise = controller.createRoom({ participantId: PARTICIPANT_ID }, USER_ID);

      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      await expect(promise).rejects.toThrow('USER_NOT_FOUND');
    });
  });

  describe('GET /rooms/:roomId', () => {
    it('delegates the route param to getRoomDetails and returns its result', async () => {
      roomsService.getRoomDetails.mockResolvedValue(roomDetail);

      const result = await controller.getRoomDetails(ROOM_ID);

      expect(roomsService.getRoomDetails).toHaveBeenCalledWith(ROOM_ID);
      expect(result).toBe(roomDetail);
    });

    it('propagates 404 ROOM_NOT_FOUND untouched', async () => {
      roomsService.getRoomDetails.mockRejectedValue(new NotFoundException('ROOM_NOT_FOUND'));

      const promise = controller.getRoomDetails(ROOM_ID);

      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      await expect(promise).rejects.toThrow('ROOM_NOT_FOUND');
    });
  });
});
