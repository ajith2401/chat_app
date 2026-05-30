import { IUser } from "../../../apps/api/src/models/User";
import { IRelationship } from "../../../apps/api/src/models/Relationship";

export type UserDTO = Omit<IUser, "passwordHash">;
export type RelationshipDTO = IRelationship;

export interface AuthResponse {
  user: UserDTO;
  token: string;
}
