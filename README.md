# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Backend API

The backend URL defaults to `https://localhost:8005`. To change it, copy
`.env.example` to `.env.local`, set `REACT_APP_API_BASE_URL`, and restart the
development server. The backend must allow requests from the frontend origin
(locally `http://localhost:5500`), including the `Authorization` and
`Content-Type` headers.

```js
import {
  postApi, updateApi, getApi, getByIdApi,
  setAccessToken, getAccessToken, removeAccessToken,
} from './api/utils';

// Example paths and response fields: use your backend's actual API contract.
const login = await postApi('/api/v1/auth/dummy-login', credentials, { auth: false });
setAccessToken(login.access_token);

const token = getAccessToken();
const projects = await getApi('/api/v1/projects', { params: { limit: 50 } });
const project = await getByIdApi('/api/v1/projects', 1);
await postApi('/api/v1/projects', { name: 'New project' });
await updateApi('/api/v1/projects/1', { name: 'Updated project' }); // PUT
await getApi('/api/v1/projects', { headers: { 'X-Tenant-ID': 'team-1' } });

removeAccessToken(); // Sign out locally.
```

Each request reads the latest `access_token` from localStorage and adds
`Authorization: Bearer <token>` when available. Use `{ auth: false }` for public
endpoints. Custom headers, query `params`, and fetch options such as `signal`
are supported. `apiRequest` also allows other methods such as `PATCH`.
Requests accept JSON data or `FormData` and return parsed JSON, text, or `null`
for empty responses. Failed HTTP requests throw `ApiError` with `status` and
`data`; network errors propagate to the caller.

The Microsoft sign-in button currently uses the temporary demo account through
`POST /api/v1/auth/dummy-login`. Configure `REACT_APP_DUMMY_USERNAME` and
`REACT_APP_DUMMY_PASSWORD` in the root `.env.local` and restart `npm start`.
These frontend environment variables are included in the browser bundle, so
use demo credentials only. `.env.local` is ignored by Git.

Successful login saves `access_token` and opens `/home`, which displays
`Hello`. Failed login stays on the login page and displays the error.
The backend requires temporary login to be enabled, HTTPS, and an allowed
frontend Origin; set `REACT_APP_API_BASE_URL` to its working HTTPS URL if needed.
The local backend allows `http://localhost:5500`, so `.env.local` sets
`PORT=5500`. React reads environment files from the project root; `src/.env`
does not configure Create React App. Restart `npm start` after changing them.
The browser must trust the backend's local TLS certificate.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:5500](http://localhost:5500) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
