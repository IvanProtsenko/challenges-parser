export default class FreezableMap<K, V> extends Map<K, V> {
  constructor(entries?: readonly (readonly [K, V])[]) {
    super(entries);
    Object.freeze(this);
  }

  set(k: K, v: V): this {
    if (Object.isFrozen(this)) {
      throw new Error('Cannot modify a frozen map.');
    }
    return super.set(k, v);
  }

  delete(k: K): boolean {
    if (Object.isFrozen(this)) {
      throw new Error('Cannot modify a frozen map.');
    }
    return super.delete(k);
  }

  clear(): void {
    if (Object.isFrozen(this)) {
      throw new Error('Cannot modify a frozen map.');
    }
    return super.clear();
  }
}
