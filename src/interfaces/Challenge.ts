import BaseFields from './BaseFields';

export default interface SbcChallenge extends BaseFields {
  price?: number;
  conditions?: string[];
}
