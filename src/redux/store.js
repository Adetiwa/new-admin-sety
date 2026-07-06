import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { reduxBatch } from '@manaflair/redux-batch';
import { persistStore } from 'redux-persist';
import { rootReducer, rootSaga } from './rootReducer';

const sagaMiddleware = createSagaMiddleware();

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck:    false,
      serializableCheck: false,
      thunk:             true,
    }).concat(sagaMiddleware),
  devTools: import.meta.env.DEV,
  enhancers: (getDefaultEnhancers) =>
    getDefaultEnhancers().concat(reduxBatch),
});

export const persistor = persistStore(store);

sagaMiddleware.run(rootSaga);

export default store;
