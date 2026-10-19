import { configureStore } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

const dummySlice = createSlice({
  name: 'dummy',
  initialState: {},
  reducers: {}
})

export const store = configureStore({
  reducer: {
    dummy: dummySlice.reducer
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch