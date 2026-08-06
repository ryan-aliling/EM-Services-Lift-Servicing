import dayjs from 'dayjs';

// Display format used across tables/dialogs.
export const formatDate = (value) => (value ? dayjs(value).format('DD MMM YYYY') : '—');

// yyyy-mm-dd format required by <input type="date">.
export const dateInputValue = (value) => (value ? dayjs(value).format('YYYY-MM-DD') : '');
