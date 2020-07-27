import * as v8 from 'v8'

/**
 * Deep clones an object *properly*.
 *
 * @param obj - The object to be deep cloned.
 *
 * @returns A deeply cloned object.
 */
export default function structuredClone<T>(obj: T): T {
  return v8.deserialize(v8.serialize(obj))
}
