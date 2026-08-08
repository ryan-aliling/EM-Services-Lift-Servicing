// Shared role constants/helpers - the single place the 3-role matrix (Master/Admin/Staff)
// is expressed as code, so every file that needs a role check imports this instead of
// hand-rolling its own string comparison. There is deliberately no "Manager" role (retired)
// and no Contractor role (a separate, larger piece of work).
export const ROLES = { MASTER: 'Master', ADMIN: 'Admin', STAFF: 'Staff' };

export const isAdminOrMaster = (role) => role === ROLES.ADMIN || role === ROLES.MASTER;
