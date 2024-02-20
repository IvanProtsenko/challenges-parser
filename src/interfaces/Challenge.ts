import {
  challenge_conditions_filters_insert_input,
  challenge_conditions_simple_insert_input,
} from '../../generated/trade';
import BaseFields from './BaseFields';

export default interface SbcChallenge extends BaseFields {
  price?: number;
  conditions?: string[];
  min_squad_rating?: number;
  chemistry?: number;
  players_number: number;
  challenge_conditions_filters?: challenge_conditions_filters_insert_input[];
  challenge_conditions_simples?: challenge_conditions_simple_insert_input[];
}
