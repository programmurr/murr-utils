type MemoizeResolver<Args extends readonly unknown[], Key> = (
  ...args: Args
) => Key;

type MemoizeOptions<Args extends readonly unknown[], Key, Return> = {
  resolver?: MemoizeResolver<Args, Key>;
  cache?: Map<Key, Return>;
};

export type MemoizedFunction<Args extends readonly unknown[], Return> = ((
  ...args: Args
) => Return) & {
  clear: () => void;
  delete: (...args: Args) => boolean;
};

type CacheNode<Return> = {
  primitive: Map<unknown, CacheNode<Return>>;
  object: WeakMap<object, CacheNode<Return>>;
  hasValue: boolean;
  value?: Return;
};

const createCacheNode = <Return>(): CacheNode<Return> => ({
  primitive: new Map(),
  object: new WeakMap(),
  hasValue: false,
});

const isObjectKey = (value: unknown): value is object =>
  (typeof value === "object" && value !== null) || typeof value === "function";

const getOrCreateChild = <Return>(
  node: CacheNode<Return>,
  key: unknown,
): CacheNode<Return> => {
  if (isObjectKey(key)) {
    const cachedNode = node.object.get(key);

    if (cachedNode) {
      return cachedNode;
    }

    const nextNode = createCacheNode<Return>();
    node.object.set(key, nextNode);
    return nextNode;
  }

  const cachedNode = node.primitive.get(key);

  if (cachedNode) {
    return cachedNode;
  }

  const nextNode = createCacheNode<Return>();
  node.primitive.set(key, nextNode);
  return nextNode;
};

const getChild = <Return>(
  node: CacheNode<Return>,
  key: unknown,
): CacheNode<Return> | undefined => {
  if (isObjectKey(key)) {
    return node.object.get(key);
  }

  return node.primitive.get(key);
};

/**
 * Lets consumers reuse cached results for repeated calls with the same arguments.
 *
 * @param fn The function to memoize. Its return value is stored after the first
 * successful call for a given argument list and reused for later calls with the
 * same arguments.
 * @param options Optional cache settings. Provide a `resolver` to derive a
 * single cache key from the function arguments, and optionally a `cache` map to
 * supply the backing store used for those resolved keys. When `resolver` is not
 * provided, memoization uses an internal argument-by-argument cache tree.
 * @returns A memoized version of `fn` with the same call signature. The
 * returned function also exposes `clear()`, which removes every cached result,
 * and `delete(...args)`, which removes the cached result for one specific
 * argument list and reports whether an entry was removed.
 */
export function memoize<Args extends readonly unknown[], Return, Key = never>(
  fn: (...args: Args) => Return,
  options: MemoizeOptions<Args, Key, Return> = {},
): MemoizedFunction<Args, Return> {
  const { resolver } = options;

  if (resolver) {
    const cache = options.cache ?? new Map<Key, Return>();

    const memoized = ((...args: Args): Return => {
      const key = resolver(...args);

      if (cache.has(key)) {
        return cache.get(key) as Return;
      }

      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as MemoizedFunction<Args, Return>;

    memoized.clear = () => {
      cache.clear();
    };

    memoized.delete = (...args: Args) => cache.delete(resolver(...args));

    return memoized;
  }

  let root = createCacheNode<Return>();

  const memoized = ((...args: Args): Return => {
    let node = root;

    for (const arg of args) {
      node = getOrCreateChild(node, arg);
    }

    if (node.hasValue) {
      return node.value as Return;
    }

    const result = fn(...args);
    node.value = result;
    node.hasValue = true;
    return result;
  }) as MemoizedFunction<Args, Return>;

  memoized.clear = () => {
    root = createCacheNode<Return>();
  };

  memoized.delete = (...args: Args) => {
    let node: CacheNode<Return> | undefined = root;

    for (const arg of args) {
      node = getChild(node, arg);

      if (!node) {
        return false;
      }
    }

    if (!node.hasValue) {
      return false;
    }

    node.hasValue = false;
    node.value = undefined;
    return true;
  };

  return memoized;
}
