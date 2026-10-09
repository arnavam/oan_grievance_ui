import { AUTH_MESSAGES } from '@/lib/authMessages';
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import { getMe, loginUser } from '@/features/auth/api/authApi';

export interface User {
  email: string;
  roles: string[];
  full_name?: string;
  first_name?: string;
  last_name?: string;
  mobile_no?: string;
  country_code?: string;
  phone_number?: string;
  type?: string;
  profile_id?: string;
  fayda_id?: string;
  administrative_area?: string;
  administrative_unit?: string;
  preferred_language?: string;
}

export type AuthStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;
}

export const loginThunk = createAsyncThunk<
  User,
  { usr: string; pwd: string; rememberMe?: boolean },
  { rejectValue: string }
>('auth/login', async ({ usr, pwd, rememberMe = false }, { rejectWithValue }) => {
  try {
    const basicUser = await loginUser({ usr, pwd, rememberMe });
    try {
      return await getMe();
    } catch {
      return basicUser;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : AUTH_MESSAGES.unexpected;
    return rejectWithValue(message);
  }
});

export const getMeThunk = createAsyncThunk<User, void, { rejectValue: string }>(
  'auth/getMe',
  async (_, { rejectWithValue }) => {
    try {
      return await getMe();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : AUTH_MESSAGES.sessionExpired;
      return rejectWithValue(message);
    }
  }
);

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.status = 'idle';
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action: PayloadAction<User>) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Something went wrong.';
      })
      .addCase(getMeThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getMeThunk.fulfilled, (state, action: PayloadAction<User>) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(getMeThunk.rejected, (state) => {
        state.status = 'failed';
        state.user = null;
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;

export const selectUser = (state: RootState) => state.auth.user;
export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectIsAuthenticated = (state: RootState) => state.auth.user !== null;

export const authReducer = authSlice.reducer;
