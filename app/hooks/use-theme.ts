import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Theme = "dark" | "light" | "system";

const getTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem("vite-ui-theme") as Theme) || "system";
};

const setTheme = (theme: Theme) => {
  return new Promise<Theme>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(theme);
      return;
    }
    localStorage.setItem("vite-ui-theme", theme);
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    resolve(theme);
  });
};

export const useTheme = () => {
  const queryClient = useQueryClient();

  const { data: theme = 'system' } = useQuery<Theme>({
    queryKey: ['theme'],
    queryFn: getTheme,
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: setTheme,
    onSuccess: (data) => {
      queryClient.setQueryData(['theme'], data)
    },
  });

  return { theme, setTheme: mutation.mutate };
};
