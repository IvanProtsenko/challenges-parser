import SbcChallenge from "./Challenge";

export default interface SbcSet {
    url: string,
    name: string,
    tradeable: boolean,
    pack_name: string,
    pack_amount: number,
    challenges?: SbcChallenge[]
}