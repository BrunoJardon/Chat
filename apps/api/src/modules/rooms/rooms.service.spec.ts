import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PRISMA_CLIENT } from '../../core/database/prisma.constants.js';
import { RoomsService } from './rooms.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PARTICIPANT_ID = '22222222-2222-4222-8222-222222222222';
const ROOM_ID = '33333333-3333-4333-8333-333333333333';
const ROOM_B_ID = '44444444-4444-4444-8444-444444444444';

function makePrisma() {
  const tx = {
    room: { create: vi.fn() },
    roomMember: { createMany: vi.fn() },
  };
  const prisma = {
    user: { findUnique: vi.fn() },
    room: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    // Interactive transaction: run the callback with the mock tx as its client,
    // which lets the test pin what the room.create/createMany calls receive.
    $transaction: vi.fn((run: (txPrisma: typeof tx) => unknown) => run(tx)),
  };
  return { prisma, tx };
}

/** A Room with the `members` include the service asks for. */
function roomRow(roomId: string = ROOM_ID) {
  return {
    id: roomId,
    name: null,
    type: 'private',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    members: [
      { roomId: ROOM_ID, userId: USER_ID, user: { id: USER_ID, name: 'Ada' } },
      { roomId: ROOM_ID, userId: PARTICIPANT_ID, user: { id: PARTICIPANT_ID, name: 'Grace' } },
    ],
  };
}

const expectedDetail = {
  id: ROOM_ID,
  type: 'private',
  participants: [
    { id: USER_ID, name: 'Ada' },
    { id: PARTICIPANT_ID, name: 'Grace' },
  ],
};

const membersInclude = {
  include: { members: { include: { user: { select: { id: true, name: true } } } } },
};

/**
 * Unwraps the value a promise rejected with. `.catch()` would type the result
 * as a union with the resolved value, so the `then` pair is used to keep it
 * unknown.
 */
function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (error: unknown) => error,
  );
}

describe('RoomsService', () => {
  let prisma: ReturnType<typeof makePrisma>['prisma'];
  let tx: ReturnType<typeof makePrisma>['tx'];
  let service: RoomsService;

  beforeEach(async () => {
    const made = makePrisma();
    prisma = made.prisma;
    tx = made.tx;

    // RoomsService injects the prisma client through the global PRISMA_CLIENT
    // token (see the comment in users.service.spec.ts: it must be a real
    // provider, not an override).
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsService, { provide: PRISMA_CLIENT, useValue: prisma }],
    }).compile();

    service = module.get<RoomsService>(RoomsService);

    prisma.user.findUnique.mockResolvedValue({ id: PARTICIPANT_ID, name: 'Grace' });
    prisma.room.findUnique.mockResolvedValue(roomRow());
  });

  describe('createRoom', () => {
    it('throws 400 SELF_PARTICIPANT before touching the database', async () => {
      const promise = service.createRoom(USER_ID, USER_ID);

      await expect(promise).rejects.toBeInstanceOf(BadRequestException);
      await expect(promise).rejects.toThrow('SELF_PARTICIPANT');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws 404 USER_NOT_FOUND when the participant does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const promise = service.createRoom(PARTICIPANT_ID, USER_ID);

      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      await expect(promise).rejects.toThrow('USER_NOT_FOUND');
      expect(prisma.room.findFirst).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('pins the participant projection so the password hash can never leak', async () => {
      prisma.room.findFirst.mockResolvedValue(null);
      tx.room.create.mockResolvedValue({ id: ROOM_ID, type: 'private' });
      tx.roomMember.createMany.mockResolvedValue({ count: 2 });

      await service.createRoom(PARTICIPANT_ID, USER_ID);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: PARTICIPANT_ID },
        select: { id: true, name: true, password: false },
      });
    });

    it('returns the existing room instead of creating a duplicate', async () => {
      prisma.room.findFirst.mockResolvedValue({ id: ROOM_ID });

      const result = await service.createRoom(PARTICIPANT_ID, USER_ID);

      expect(result).toEqual(expectedDetail);
      expect(prisma.room.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.room.findUnique).toHaveBeenCalledWith({
        where: { id: ROOM_ID },
        ...membersInclude,
      });
    });

    it('looks the existing room up as a private room shared by both users (direction-independent)', async () => {
      prisma.room.findFirst.mockResolvedValue(null);
      tx.room.create.mockResolvedValue({ id: ROOM_ID, type: 'private' });
      tx.roomMember.createMany.mockResolvedValue({ count: 2 });

      await service.createRoom(PARTICIPANT_ID, USER_ID);

      // `userId`/`participantId` swapped is the same query: the pair is an
      // unordered set, so B creating the conversation with A finds A's room.
      expect(prisma.room.findFirst).toHaveBeenCalledWith({
        where: {
          type: 'private',
          AND: [
            { members: { some: { userId: USER_ID } } },
            { members: { some: { userId: PARTICIPANT_ID } } },
          ],
        },
      });
    });

    it('creates the room and both memberships inside a single transaction', async () => {
      prisma.room.findFirst.mockResolvedValue(null);
      tx.room.create.mockResolvedValue({ id: ROOM_ID, type: 'private' });
      tx.roomMember.createMany.mockResolvedValue({ count: 2 });

      const result = await service.createRoom(PARTICIPANT_ID, USER_ID);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.room.create).toHaveBeenCalledWith({ data: { type: 'private' } });
      expect(tx.roomMember.createMany).toHaveBeenCalledWith({
        data: [
          { roomId: ROOM_ID, userId: USER_ID },
          { roomId: ROOM_ID, userId: PARTICIPANT_ID },
        ],
      });
      // The response comes from a re-read of the room, not from the raw create.
      expect(prisma.room.findUnique).toHaveBeenCalledWith({
        where: { id: ROOM_ID },
        ...membersInclude,
      });
      expect(result).toEqual(expectedDetail);
    });
  });

  describe('getRoomDetails', () => {
    it('returns { id, type, participants } for an existing room', async () => {
      const result = await service.getRoomDetails(ROOM_ID);

      expect(result).toEqual(expectedDetail);
    });

    it('projects members as { id, name } only — no email, no password', async () => {
      await service.getRoomDetails(ROOM_ID);

      expect(prisma.room.findUnique).toHaveBeenCalledWith({
        where: { id: ROOM_ID },
        include: { members: { include: { user: { select: { id: true, name: true } } } } },
      });
      const result = await service.getRoomDetails(ROOM_ID);
      for (const participant of result.participants) {
        expect(participant).not.toHaveProperty('email');
        expect(participant).not.toHaveProperty('password');
      }
    });

    it('throws 404 ROOM_NOT_FOUND when the room does not exist', async () => {
      prisma.room.findUnique.mockResolvedValue(null);

      const promise = service.getRoomDetails(ROOM_ID);

      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      await expect(promise).rejects.toThrow('ROOM_NOT_FOUND');
      const error = await rejection(promise);
      expect((error as NotFoundException).getStatus()).toBe(404);
    });
  });

  describe('listRooms', () => {
    it('lists the caller rooms, newest first, from a single query', async () => {
      prisma.room.findMany.mockResolvedValue([roomRow(ROOM_B_ID), roomRow()]);

      const result = await service.listRooms(USER_ID);

      expect(prisma.room.findMany).toHaveBeenCalledWith({
        where: { members: { some: { userId: USER_ID } } },
        orderBy: { createdAt: 'desc' },
        include: { members: { include: { user: { select: { id: true, name: true } } } } },
      });
      // One query for the whole list: no per-room re-read (no N+1).
      expect(prisma.room.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual([{ ...expectedDetail, id: ROOM_B_ID }, expectedDetail]);
    });

    it('projects members as { id, name } only — no email, no password', async () => {
      prisma.room.findMany.mockResolvedValue([roomRow()]);

      const [room] = await service.listRooms(USER_ID);

      for (const participant of room.participants) {
        expect(participant).not.toHaveProperty('email');
        expect(participant).not.toHaveProperty('password');
      }
    });

    it('returns an empty list when the caller has no rooms', async () => {
      prisma.room.findMany.mockResolvedValue([]);

      await expect(service.listRooms(USER_ID)).resolves.toEqual([]);
    });
  });
});
