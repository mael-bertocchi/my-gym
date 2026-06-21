/**
 * @function round
 * @description Rounds a number to one decimal place.
 *
 * @param {number} value The value to round.
 * @returns {number} The value rounded to one decimal.
 */
export function round(value: number): number {
    return Math.round(value * 10) / 10;
}
