import { CreateRoomRequest } from '@chat/types';
import { IsUUID } from 'class-validator';

export class CreateRoomDto implements CreateRoomRequest {
  @IsUUID()
  readonly participantId: string;
}
