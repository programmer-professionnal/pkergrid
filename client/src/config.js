const DEV = import.meta.env.DEV

export const SERVER_URL = DEV
  ? 'http://localhost:3001'
  : 'https://pkergrid.onrender.com'
