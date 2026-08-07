import dayjs from 'dayjs';

export const LIFT_TYPES = ['Passenger', 'Freight', 'Mixed'];
export const LIFT_STATUSES = ['Active', 'Maintenance', 'Out of Service', 'Decommissioned'];

// A lift is flagged as service-due once it's been more than 180 days since its last service.
export const SERVICE_DUE_DAYS = 180;

export const isServiceDue = (lift) => {
  if (!lift.lastServiced) return true;
  return dayjs().diff(dayjs(lift.lastServiced), 'day') >= SERVICE_DUE_DAYS;
};
