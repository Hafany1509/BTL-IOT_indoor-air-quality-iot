export const canAdminister = user => user?.role === 'ADMIN';
export const canRequestControl = user => ['ADMIN', 'OPERATOR'].includes(user?.role);
export const canQuickControl = canAdminister;
