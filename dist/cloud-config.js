// Enable the expanded group fields only after the Firestore rules release is published.
const local = ['localhost','127.0.0.1'].includes(location.hostname);
const params = new URLSearchParams(location.search);
export const emulate = local&&params.get('emulator')==='1';
export const extendedGroups = emulate?params.get('legacy')!=='1':false;
