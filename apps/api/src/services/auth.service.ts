import type { RegisterRequest } from "@chat/shared/auth";
import type { UserResponse } from "@chat/shared/user";

import bcrypt from "bcrypt";
import { QueryFailedError } from "typeorm";

import { AppDataSource } from "../db/data-source.js";
import { User } from "../db/entities/index.js";

const BCRYPT_COST = 12;
const UNIQUE_VIOLATION_CODE = "23505";

export class RegisterConflictError extends Error {
  public readonly field: "email" | "username";

  public constructor(field: "email" | "username") {
    super(field === "email" ? "Email is already in use." : "Username is already in use.");
    this.name = "RegisterConflictError";
    this.field = field;
  }
}

export async function registerUser(request: RegisterRequest): Promise<UserResponse> {
  const usersRepository = AppDataSource.getRepository(User);

  const emailTaken = await usersRepository.existsBy({ email: request.email });
  if (emailTaken) throw new RegisterConflictError("email");

  const usernameTaken = await usersRepository.existsBy({ username: request.username });
  if (usernameTaken) throw new RegisterConflictError("username");

  let savedUser: User;
  try {
    const user = usersRepository.create({
      email: request.email,
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
