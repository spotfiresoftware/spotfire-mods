/**
 * Checks if two dom rectangles are overlap
 * @param firstArea
 * @param secondArea
 */
export function overlap(firstArea: DOMRect, secondArea: DOMRect): boolean {
    return !(
        firstArea.right < secondArea.left ||
        firstArea.left > secondArea.right ||
        firstArea.bottom < secondArea.top ||
        firstArea.top > secondArea.bottom
    );
}
