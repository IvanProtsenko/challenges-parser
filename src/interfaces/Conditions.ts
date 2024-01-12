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

const FILTER_PRIORITIES = new FreezableMap<PlayerProperty, number>([
  ['club', 10000],
  ['nation', 1000],
  ['league', 100],
  ['rating', 10],
  ['rarity', 1],
]);

export interface ConditionValue {
  property: PlayerProperty;
  value: number | string | string[] | number[];
  count: number;
  operation: Operation;
}

interface NeededConditionValue extends ConditionValue {
  type: ConditionType;
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
