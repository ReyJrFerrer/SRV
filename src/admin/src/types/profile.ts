import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Profile {
  'id' : Principal,
  'name' : string,
  'createdAt' : Time,
  'role' : UserRole,
  'biography' : [] | [string],
  'updatedAt' : Time,
  'isLocked' : [] | [boolean],
  'phone' : string,
  'profilePicture' : [] | [ProfileImage],
  'activeRole' : UserRole,
}
export interface ProfileImage { 'thumbnailUrl' : string, 'imageUrl' : string }
export type Result = { 'ok' : Profile } |
  { 'err' : string };
export type Time = bigint;
export type UserRole = { 'Client' : null } |
  { 'Admin' : null } |
  { 'ServiceProvider' : null };
export interface _SERVICE {
  'getProfile' : ActorMethod<[Principal], Result>,
  'isPrincipalValid' : ActorMethod<[Principal], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
