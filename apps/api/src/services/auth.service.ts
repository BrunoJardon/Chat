import type { AuthResponse, LoginRequest, RegisterRequest } from "@chat/shared/auth";
import type { UserResponse } from "@chat/shared/user";

import bcrypt from "bcrypt";
import { SignJWT } from "jose";
import { createHash, randomBytes } from "node:crypto";
import { QueryFailedError } from "typeorm";

import { JWT_ACCESS_SECRET, JWT_ACCESS_TTL, REFRESH_TOKEN_TTL_DAYS } from "../config/env.js";
import { AppDataSource } from "../db/data-source.js";
import { RefreshToken, User } from "../db/entities/index.js";

const BCRYPT_COST = 12;
const REFRESH_TOKEN_BYTES = 48;
const UNIQUE_VIOLATION_CODE = "23505";

export class InvalidCredentialsError extends Error {
  public constructor() {
    super("Invalid credentials.");
    this.name = "InvalidCredentialsError";
  }
}

export class RegisterConflictError extends Error {
  public readonly field: "email" | "username";

  public constructor(field: "email" | "username") {
    super(field === "email" ? "Email is already in use." : "Username is already in use.");
    this.name = "RegisterConflictError";
    this.field = field;
  }
}

export async function loginUser(request: LoginRequest): Promise<AuthResponse> {
  const usersRepository = AppDataSource.getRepository(User);

  const user = await usersRepository.findOneBy(
    request.identifier.includes("@") ? { email: request.identifier.toLowerCase() } : { username: request.identifier },
  );
  if (!user || !(await bcrypt.compare(request.password, user.passwordHash))) {
    throw new InvalidCredentialsError();
  }

  return {
    accessToken: await signAccessToken(user.id),
    refreshToken: await issueRefreshToken(user.id),
    user: toUserResponse(user),
  };
}

export async function registerUser(request: RegisterRequest): Promise<UserResponse> {
  const usersRepository = AppDataSource.getRepository(User);

  const email = request.email.toLowerCase();
  const emailTaken = await usersRepository.existsBy({ email });
  if (emailTaken) throw new RegisterConflictError("email");

  const usernameTaken = await usersRepository.existsBy({ username: request.username });
  if (usernameTaken) throw new RegisterConflictError("username");

  let savedUser: User;
  try {
    const user = usersRepository.create({
      email,
      firstName: request.firstName,
      lastName: request.lastName,
      passwordHash: await bcrypt.hash(request.password, BCRYPT_COST),
      username: request.username,
    });
    savedUser = await usersRepository.save(user);
  } catch (error) {
    const driverCode = error instanceof QueryFailedError ? (error.driverError as undefined | { code?: string })?.code : undefined;
    if (driverCode === UNIQUE_VIOLATION_CODE) throw new RegisterConflictError("email");
    throw error;
  }

  return toUserResponse(savedUser);
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

async function issueRefreshToken(userId: string): Promise<string> {
  const refreshTokensRepository = AppDataSource.getRepository(RefreshToken);

  const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
  await refreshTokensRepository.save(
    refreshTokensRepository.create({
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      tokenHash: hashToken(rawToken),
      user: { id: userId },
    }),
  );
  return rawToken;
}

async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(JWT_ACCESS_TTL)
    .setIssuedAt()
    .setSubject(userId)
    .sign(new TextEncoder().encode(JWT_ACCESS_SECRET));
}

function toUserResponse(user: User): UserResponse {
  return {
    avatar: user.avatar,
    createdAt: user.createdAt.toISOString(),
    email: user.email,
    firstName: user.firstName,
    id: user.id,
    lastName: user.lastName,
    username: user.username,
  };
}
