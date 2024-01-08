import BaseFields from "./BaseFields";
import SbcChallenge from "./Challenge";

export default interface SbcSet extends BaseFields {
    challenges?: SbcChallenge[]
}