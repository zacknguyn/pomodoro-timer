// Explicit development-only preview; normal builds use accounts and the API.
export const LOCAL_PREVIEW = import.meta.env?.DEV === true && import.meta.env?.VITE_DEV_BYPASS_AUTH === 'true'
