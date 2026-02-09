// Date utilities for consistent EST timezone handling
// Divers Direct is US-based, all dates should be in Eastern Time

export const EST_TIMEZONE = 'America/New_York'

/**
 * Format a date to EST date string (YYYY-MM-DD)
 */
export function toESTDateString(date: Date): string {
    return date.toLocaleDateString('en-CA', { timeZone: EST_TIMEZONE }) // en-CA gives YYYY-MM-DD format
}

/**
 * Get date components (year, month, day) from a Date or ISO string
 * Dates are stored at noon UTC, so we extract the UTC date directly
 */
export function getESTDateParts(dateInput: Date | string): { year: number; month: number; day: number } {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    // Since dates are stored at noon UTC, extract UTC date components directly
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth(), // 0-indexed
        day: date.getUTCDate(),
    }
}

/**
 * Create a Date object representing noon EST on a given year/month/day
 * This avoids timezone edge cases by setting the time to noon
 */
export function createESTDate(year: number, month: number, day: number): Date {
    // Create a date string in EST and parse it
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00`
    // Create date as if in EST (offset -5 or -4 depending on DST)
    const estOffset = getESTOffset(new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`))
    return new Date(dateStr + estOffset)
}

/**
 * Get the current EST offset string (-05:00 or -04:00 for DST)
 */
function getESTOffset(date: Date): string {
    // Simple check: EDT (DST) is from second Sunday of March to first Sunday of November
    const year = date.getFullYear()
    const marchSecondSunday = getNthSundayOfMonth(year, 2, 2) // March, 2nd Sunday
    const novFirstSunday = getNthSundayOfMonth(year, 10, 1) // November, 1st Sunday

    if (date >= marchSecondSunday && date < novFirstSunday) {
        return '-04:00' // EDT
    }
    return '-05:00' // EST
}

function getNthSundayOfMonth(year: number, month: number, n: number): Date {
    const date = new Date(year, month, 1)
    const dayOfWeek = date.getDay()
    const firstSunday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    return new Date(year, month, firstSunday + (n - 1) * 7, 2, 0, 0) // 2 AM for DST transition
}

/**
 * Format an ISO date string to display in EST
 */
export function formatESTDate(isoString: string, options?: Intl.DateTimeFormatOptions): string {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', {
        timeZone: EST_TIMEZONE,
        ...options,
    })
}

/**
 * Convert a local Date (from date picker) to an ISO string that represents that date at noon UTC
 * This ensures the date displayed in the calendar matches what the user selected,
 * regardless of their local timezone.
 */
export function localDateToESTISOString(date: Date): string {
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()

    // Store as noon UTC to avoid date boundary issues
    // This ensures the date will display correctly regardless of timezone
    const isoStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00.000Z`

    return isoStr
}

/**
 * Get today's date in EST
 */
export function getTodayEST(): { year: number; month: number; day: number } {
    return getESTDateParts(new Date())
}
