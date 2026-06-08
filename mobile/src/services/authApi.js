import { apiRequest, setToken } from './api';

export async function register(email, password) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: {
      email,
      password,
    },
  });

  await setToken(data.accessToken, data.refreshToken);

  return data;
}

export default register;