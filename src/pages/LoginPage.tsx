import { useAuth } from "../hooks/useAuth";
import { useGetTokenMutation, useLogoutMutation } from "../services/auth";
import { useGetUsersQuery } from "../services/users.ts";
import { type SyntheticEvent } from "react";

type AuthArgs = { email: string; password: string };

export const LoginPage = () => {
  const [getToken, result] = useGetTokenMutation();
  const [logout] = useLogoutMutation();
  const { data } = useGetUsersQuery();

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData) as AuthArgs;
    getToken(payload);
  };

  const handleLogout = () => {
    logout();
  };

  const auth = useAuth();

  if (auth.isAuth) {
    return (
      <div>
        <p>{JSON.stringify(data)}</p>
        <button
          className="mt-8 py-3 w-full cursor-pointer rounded-md bg-indigo-600 text-white transition hover:bg-indigo-700"
          onClick={handleLogout}
          type="button"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <main className="flex items-center justify-center w-full px-4">
      <form className="flex w-full flex-col max-w-96" onSubmit={handleSubmit}>
        <a
          href="https://prebuiltui.com"
          className="mb-8"
          title="Go to PrebuiltUI"
        >
          <svg
            className="size-10"
            width="30"
            height="33"
            viewBox="0 0 30 33"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="m8 4.55 6.75 3.884 6.75-3.885M8 27.83v-7.755L1.25 16.19m27 0-6.75 3.885v7.754M1.655 8.658l13.095 7.546 13.095-7.546M14.75 31.25V16.189m13.5 5.976V10.212a2.98 2.98 0 0 0-1.5-2.585L16.25 1.65a3.01 3.01 0 0 0-3 0L2.75 7.627a3 3 0 0 0-1.5 2.585v11.953a2.98 2.98 0 0 0 1.5 2.585l10.5 5.977a3.01 3.01 0 0 0 3 0l10.5-5.977a3 3 0 0 0 1.5-2.585"
              stroke="#1d293d"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </a>

        <h2 className="text-4xl font-medium text-gray-900">Sign in</h2>

        <p className="mt-4 text-base text-gray-500/90">
          Please enter email and password to access.
        </p>

        <div className="mt-10">
          <label className="font-medium">Email</label>
          <input
            placeholder="Please enter your email"
            className="mt-2 rounded-md ring ring-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none px-3 py-3 w-full"
            required
            type="email"
            name="email"
          />
        </div>

        <div className="mt-6">
          <label className="font-medium">Password</label>
          <input
            placeholder="Please enter your password"
            className="mt-2 rounded-md ring ring-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none px-3 py-3 w-full"
            required
            type="password"
            name="password"
          />
        </div>

        {result.isError && (
          <div
            id="password-error"
            className="mt-2 flex items-start text-sm text-red-600 animate-fadeIn"
          >
            <svg
              className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium">Неверный пароль</p>
              <p className="text-red-500">
                Проверьте правильность ввода. Учтите регистр букв.
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={result.isLoading}
          className="mt-8 py-3 w-full cursor-pointer rounded-md bg-indigo-600 text-white transition hover:bg-indigo-700"
        >
          Login
        </button>
        <p className="text-center py-8">
          Don't have an account?{" "}
          <a href="/signup" className="text-indigo-600 hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </main>
  );
};
