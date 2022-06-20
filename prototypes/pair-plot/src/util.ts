export async function nonBlockingForEach<T>(
    list: T[],
    cb: (element: T, index: number, list: T[]) => void
) {
    for (let index = 0; index < list.length; index++) {
        await cb(list[index], index, list);
    }
}

