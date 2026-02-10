import { useGetUsersQuery } from "@/services/users";

export const MainPage = () => {
  const { data } = useGetUsersQuery();
  return (
    <div>
      MainPage<i className="hn hn-github"></i>
      {JSON.stringify(data)}
    </div>
  );
};
