import FreezableMap from '../utils/FreezableMap';
import PlayerEntity from './PlayerEntity';

export type PlayerProperty =
  | 'club'
  | 'nation'
  | 'rarity'
  | 'league'
  | 'rating'
  | 'level';

export type DistributionPlayerProperty = 'club' | 'league' | 'nation';
type PropertyDistributionType = 'minSame' | 'maxSame' | 'minDiff' | 'maxDiff';
type Operation = 'eq' | 'gt' | 'in' | 'nin';
export enum ConditionType {
  COMMON_FILTER,
  DISTRIBUTION,
}

export interface Slot<T> {
  filters: T[];
}

export type SlotFilter = {
  property: PlayerProperty;
  cb: (p: PlayerEntity) => boolean;
  type: ConditionType;
};

export interface ConditionValue {
  property: PlayerProperty;
  value: string;
  count: number;
  operation: Operation;
}

export interface Conditions {
  filters?: ConditionValue[];
  distributions: {
    property: DistributionPlayerProperty;
    type: PropertyDistributionType;
    count: number;
  }[];
  minSquadRating?: number;
}
