export function createPairs<T = unknown>(set: T[]): [T, T][] {
    let results: [T, T][] = [];
    for (let i = 0; i < set.length; i++) {
        for (let j = i + 1; j < set.length; j++) {
            results.push([set[i], set[j]]);
        }
    }

    return results;
}
