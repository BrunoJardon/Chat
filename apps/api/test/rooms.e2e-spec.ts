import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

// Requires postgres + redis running (docker compose up -d), same as the other
// e2e suites. The suite is repeatable: every registered email is unique.
const password = 'correct-horse-battery';
const A_NAME = 'Rooms E2E A';
const B_NAME = 'Rooms E2E B';
const C_NAME = 'Rooms E2E C';

interface AuthBody {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
}

interface Participant {
  id: string;
  name: string;
}

describe('Rooms (e2e)', () => {
  let app: INestApplication;

  // Flow state. Vitest runs the tests of a file sequentially, in declaration
  // order, so the lifecycle below is deterministic.
  let a: AuthBody;
  let b: AuthBody;
  let c: AuthBody;

  async function register(name: string): Promise<AuthBody> {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name, email: `e2e+rooms+${randomUUID()}@test.local`, password });

    expect(res.status).toBe(201);
    return res.body as AuthBody;
  }

  function createRoom(token: string, participantId: string) {
    return request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ participantId });
  }

  function getRoom(token: string, roomId: string) {
    return request(app.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`);
  }

  function listRooms(token: string) {
    return request(app.getHttpServer()).get('/rooms').set('Authorization', `Bearer ${token}`);
  }

  /** Prisma does not guarantee the `members` order, so compare as a set. */
  function byId(participants: Participant[]) {
    return [...participants].sort((x, y) => x.id.localeCompare(y.id));
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Same global pipe as main.ts, so DTO validation behaves like in production.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers users A, B and C', async () => {
    a = await register(A_NAME);
    b = await register(B_NAME);
    c = await register(C_NAME);

    expect(a.user.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  describe('POST /rooms', () => {
    it('creates a private 1:1 room with both participants (201)', async () => {
      const res = await createRoom(a.accessToken, b.user.id);

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.body.type).toBe('private');
      expect(byId(res.body.participants)).toEqual(
        byId([
          { id: a.user.id, name: A_NAME },
          { id: b.user.id, name: B_NAME },
        ]),
      );
      for (const participant of res.body.participants as Participant[]) {
        expect(participant).not.toHaveProperty('email');
        expect(participant).not.toHaveProperty('password');
      }
    });

    it('is idempotent: repeating the same pair returns the same room', async () => {
      const first = await createRoom(a.accessToken, b.user.id);
      const second = await createRoom(a.accessToken, b.user.id);

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(second.body.id).toBe(first.body.id);
    });

    it('is direction-independent: B starting the conversation finds the same room', async () => {
      const fromA = await createRoom(a.accessToken, b.user.id);
      const fromB = await createRoom(b.accessToken, a.user.id);

      expect(fromB.status).toBe(201);
      expect(fromB.body.id).toBe(fromA.body.id);
    });

    it('rejects a conversation with yourself (400 SELF_PARTICIPANT)', async () => {
      const res = await createRoom(a.accessToken, a.user.id);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('SELF_PARTICIPANT');
    });

    it('returns 404 USER_NOT_FOUND for an unknown participant', async () => {
      const res = await createRoom(a.accessToken, randomUUID());

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('USER_NOT_FOUND');
    });

    it('returns 400 for a participant id that is not a uuid', async () => {
      const res = await createRoom(a.accessToken, 'not-a-uuid');

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.any(Array));
    });
  });

  describe('GET /rooms/:roomId', () => {
    let roomId: string;

    beforeAll(async () => {
      const res = await createRoom(a.accessToken, b.user.id);
      roomId = res.body.id as string;
    });

    it('returns the detail to a member (200)', async () => {
      const res = await getRoom(a.accessToken, roomId);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(roomId);
      expect(res.body.type).toBe('private');
      expect(byId(res.body.participants)).toEqual(
        byId([
          { id: a.user.id, name: A_NAME },
          { id: b.user.id, name: B_NAME },
        ]),
      );
    });

    it('returns 403 NOT_ROOM_MEMBER for a non-member', async () => {
      const res = await getRoom(c.accessToken, roomId);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('NOT_ROOM_MEMBER');
    });

    it('returns 404 ROOM_NOT_FOUND for an unknown room', async () => {
      const res = await getRoom(a.accessToken, randomUUID());

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('ROOM_NOT_FOUND');
    });
  });

  describe('GET /rooms', () => {
    let roomId: string;

    beforeAll(async () => {
      const res = await createRoom(a.accessToken, b.user.id);
      roomId = res.body.id as string;
    });

    it('lists the caller rooms, each with both participants', async () => {
      const res = await listRooms(a.accessToken);

      expect(res.status).toBe(200);
      const room = (res.body as { id: string; type: string; participants: Participant[] }[]).find(
        (candidate) => candidate.id === roomId,
      );
      expect(room).toBeDefined();
      expect(room!.type).toBe('private');
      expect(byId(room!.participants)).toEqual(
        byId([
          { id: a.user.id, name: A_NAME },
          { id: b.user.id, name: B_NAME },
        ]),
      );
    });

    it('returns an empty list for a user that belongs to no room', async () => {
      const res = await listRooms(c.accessToken);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('authentication', () => {
    it('returns 401 without a token on POST and on GET', async () => {
      const post = await request(app.getHttpServer())
        .post('/rooms')
        .send({ participantId: b.user.id });
      const get = await request(app.getHttpServer()).get(`/rooms/${randomUUID()}`);

      expect(post.status).toBe(401);
      expect(get.status).toBe(401);
      expect(post.body.message).toBe('MISSING_BEARER_TOKEN');
    });
  });
});
