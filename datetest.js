
const EST_TIMEZONE = 'America/New_York'

function getESTDateParts(dateInput) {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: EST_TIMEZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    })
    const parts = formatter.formatToParts(date)
    return {
        year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
        month: parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1,
        day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
    }
}

// Test case 1: Jan 21 17:00 UTC (12:00 EST)
const testDate = "2026-01-21T17:00:00.000Z"
console.log('Input:', testDate)
console.log('EST Parts:', getESTDateParts(testDate))

// Test case 2: Jan 14 18:30 from previous bug
const testDate2 = "2026-01-14T18:30:00" // No Z, so local time?
console.log('Input 2:', testDate2)
console.log('EST Parts 2:', getESTDateParts(testDate2))
