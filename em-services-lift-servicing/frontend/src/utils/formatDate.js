import dayjs from 'dayjs';

// Display format used across tables/dialogs.
export const formatDate = (value) => (value ? dayjs(value).format('DD MMM YYYY') : '—');

// Same as formatDate but with the time - used where the hour/minute actually matters
// (e.g. the Audit Log, where two events on the same day still need to be told apart).
export const formatDateTime = (value) => (value ? dayjs(value).format('DD MMM YYYY, HH:mm') : '—');

// yyyy-mm-dd format required by <input type="date">.
export const dateInputValue = (value) => (value ? dayjs(value).format('YYYY-MM-DD') : '');
