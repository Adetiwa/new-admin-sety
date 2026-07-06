import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { put, takeLatest, call } from 'redux-saga/effects';
import { getUserByToken } from './authCrud';

export const actionTypes = {
  Login:         '[Login] Action',
  Logout:        '[Logout] Action',
  ResetToken:    '[Reset] Token',
  UserRequested: '[Request User] Action',
  UserLoaded:    '[Load User] Auth API',
};

const initialState = {
  user:         undefined,
  authToken:    undefined,
  refreshToken: undefined,
};

export const reducer = persistReducer(
  {
    storage,
    key:       'sety-admin-auth',
    whitelist: ['user', 'authToken', 'refreshToken'],
  },
  (state = initialState, action) => {
    switch (action.type) {

      case actionTypes.Login: {
        const { authToken, refreshToken } = action.payload;
        return { ...state, authToken, refreshToken, user: undefined };
      }

      case actionTypes.ResetToken: {
        const { authToken, refreshToken } = action.payload;
        return { ...state, authToken, refreshToken };
      }

      case actionTypes.Logout:
        return initialState;

      case actionTypes.UserLoaded: {
        const { user } = action.payload;
        return { ...state, user };
      }

      default:
        return state;
    }
  }
);

export const actions = {
  login: (authToken, refreshToken) => ({
    type:    actionTypes.Login,
    payload: { authToken, refreshToken },
  }),
  logout: () => ({ type: actionTypes.Logout }),
  fulfillToken: (authToken, refreshToken) => ({
    type:    actionTypes.ResetToken,
    payload: { authToken, refreshToken },
  }),
  requestUser:  () => ({ type: actionTypes.UserRequested }),
  fulfillUser:  (user) => ({ type: actionTypes.UserLoaded, payload: { user } }),
};

export function* saga() {
  yield takeLatest(actionTypes.Login, function* loginSaga() {
    yield put(actions.requestUser());
  });

  yield takeLatest(actionTypes.UserRequested, function* userRequested() {
    try {
      const { data } = yield call(getUserByToken);
      if (data?.user) yield put(actions.fulfillUser(data.user));
    } catch (err) {
      console.error('Failed to load user profile', err);
    }
  });
}
