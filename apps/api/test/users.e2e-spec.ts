import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

// Requires postgres + redis running (docker compose up -d), same as auth.e2e-spec.ts.
const password = 'correct-horse-battery';
const A_NAME = 'Users E2E A';
const B_NAME = 'Users E2E B';
const PATCHED_NAME = 'New Name';

interface AuthBody {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
}

describe('Users (e2e)', () => {
  let app: INestApplication;

  // Flow state. Vitest runs the tests of a file sequentially, in declaration
  // order, so the lifecycle below is deterministic.
  let a: AuthBody;
  let b: AuthBody;

  /**
   * Registers a throwaway account. The email is unique per call so the suite
   * can be executed repeatedly against the same database.
   */
  async function register(name: string): Promise<AuthBody> {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name, email: `e2e+users+${randomUUID()}@test.local`, password });

    expect(res.status).toBe(201);
    return res.body as AuthBody;
  }

  /** GET /users/me with user A's token, i.e. the caller's own profile. */
  async function getMe() {
    return request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${a.accessToken}`);
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

  it('registers user A and gets a token whose subject is the user id', async () => {
    a = await register(A_NAME);

    expect(a.user.name).toBe(A_NAME);
    expect(a.user.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  describe('GET /users/me', () => {
    it('returns 200 with the caller profile and no password', async () => {
      const res = await getMe();

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: a.user.id, email: a.user.email, name: A_NAME });
      expect(res.body).not.toHaveProperty('password');
    });
  });

  describe('PATCH /users/me', () => {
    it('returns 200 and the change is persisted', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${a.accessToken}`)
        .send({ name: PATCHED_NAME });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: a.user.id, email: a.user.email, name: PATCHED_NAME });
      expect(res.body).not.toHaveProperty('password');

      // Re-read: the response alone would also pass if the service echoed the
      // payload without writing it.
      const me = await getMe();
      expect(me.body).toEqual({ id: a.user.id, email: a.user.email, name: PATCHED_NAME });
    });

    it('treats an empty body as a no-op and leaves the name untouched', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${a.accessToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: a.user.id, email: a.user.email, name: PATCHED_NAME });

      const me = await getMe();
      expect(me.body.name).toBe(PATCHED_NAME);
    });

    it('rejects names outside 3..40 chars with 400 and writes nothing', async () => {
      const invalid = ['ab', 'x'.repeat(41)];

      for (const name of invalid) {
        const res = await request(app.getHttpServer())
          .patch('/users/me')
          .set('Authorization', `Bearer ${a.accessToken}`)
          .send({ name });

        expect(res.status).toBe(400);
        expect(res.body.message).toEqual(expect.any(Array));
      }

      const me = await getMe();
      expect(me.body.name).toBe(PATCHED_NAME);
    });

    it('accepts the boundary values 3 and 40 chars (the limits are inclusive)', async () => {
      for (const name of ['abc', 'x'.repeat(40)]) {
        const res = await request(app.getHttpServer())
          .patch('/users/me')
          .set('Authorization', `Bearer ${a.accessToken}`)
          .send({ name });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe(name);
      }
    });
  });

  describe('GET /users/:id', () => {
    it('returns 200 with { id, name } of another user and no email', async () => {
      b = await register(B_NAME);

      const res = await request(app.getHttpServer())
        .get(`/users/${b.user.id}`)
        .set('Authorization', `Bearer ${a.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: b.user.id, name: B_NAME });
      expect(res.body).not.toHaveProperty('email');
      expect(res.body).not.toHaveProperty('password');
    });

    it('returns 404 USER_NOT_FOUND for an unknown id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${randomUUID()}`)
        .set('Authorization', `Bearer ${a.accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('USER_NOT_FOUND');
    });

    it('does not let "me" be swallowed by the :id route', async () => {
      // `me` is declared before `:id`, so it must reach the profile handler
      // instead of being read as a user id.
      const res = await getMe();

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(a.user.id);
    });
  });

  describe('authentication', () => {
    it('returns 401 without a token (the global guard protects the module)', async () => {
      const res = await request(app.getHttpServer()).get('/users/me');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('MISSING_BEARER_TOKEN');
    });

    it('returns 401 for a PATCH and for the public route as well', async () => {
      const patch = await request(app.getHttpServer())
        .patch('/users/me')
        .send({ name: PATCHED_NAME });
      const publicRoute = await request(app.getHttpServer()).get(`/users/${b.user.id}`);

      expect(patch.status).toBe(401);
      expect(publicRoute.status).toBe(401);
    });
  });
});
