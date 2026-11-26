import {
  DUMMY_CREDENTIALS,
  DUMMY_LOGIN_ENDPOINT,
  postApi,
  setAccessToken,
} from '../utils';

/** Sign in with the temporary demo account and save the backend access token. */
export async function login(credentials = DUMMY_CREDENTIALS) {
  if (!credentials?.username || !credentials?.password) {
    throw new Error('Dummy login credentials are missing. Configure them in .env.local and restart the app.');
  }

  const response = await postApi(DUMMY_LOGIN_ENDPOINT, {
    username: credentials.username,
    password: credentials.password,
  }, { auth: false });

  if (!response?.access_token) {
    throw new Error('The login response did not include an access token.');
  }

  setAccessToken(response.access_token);
  return response;
}

