import BaseFields from './BaseFields';
import SbcChallenge from './Challenge';

export default interface SbcSet extends BaseFields {
  url: string;
  challenges?: SbcChallenge[];
  expires_at?: number;
  repeatable?: boolean;
}
