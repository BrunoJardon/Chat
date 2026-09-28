export interface UserProfile {
  readonly id: string;

  readonly email: string;

  readonly name: string;
}

export interface PublicUserProfile {
  readonly id: string;

  readonly name: string;
}

export interface UpdateProfileRequest {
  readonly name?: string;
}
