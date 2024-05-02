export const text = 'minimum ovr of 84 : min 2';
console.log(text.match(/minimum ovr of.+(min) [0-9]/));
const count = Number(
  text
    .split(/(ovr of )/i)
    .at(-1)!
    .split(' ')[0]
);
console.log(count);
