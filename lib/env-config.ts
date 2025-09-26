// IMPORTANT: When adding new env variables to the codebase, update this array
export const ENV_VARIABLES: EnvVariable[] = [
  {
    name: "PEK_LOGIN",
    description: "Логин пользователя личного кабинета ПЭК",
    required: true,
    instructions: "Перейдите на [kabinet.pecom.ru](https://kabinet.pecom.ru) и введите ваш логин от личного кабинета. Если у вас нет логина, зарегистрируйтесь на сайте ПЭК."
  },
  {
    name: "PEK_API_KEY",
    description: "API ключ доступа к ПЭК",
    required: true,
    instructions: "Войдите в [kabinet.pecom.ru](https://kabinet.pecom.ru) → Регистрационные данные → Ключи API. Создайте новый ключ и скопируйте его значение."
  }
];

// SUPABASE/DATABASE VARIABLES (uncomment and add to ENV_VARIABLES array when adding database features)
// {
//   name: "DATABASE_URL",
//   description: "Supabase PostgreSQL database connection string for migrations and server-side operations",
//   required: true,
//   instructions: "Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Settings → Database → Connection string (URI format).\n Copy the full postgresql:// connection string.\n Make sure to replace [YOUR-PASSWORD] with actual password"
// },
// {
//   name: "NEXT_PUBLIC_SUPABASE_URL",
//   description: "Supabase project URL for client-side authentication and API calls",
//   required: true,
//   instructions: "Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Settings → Data API → Copy the 'Project URL -> URL' field (format: https://[project-id].supabase.co)"
// },
// {
//   name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
//   description: "Supabase anonymous/publishable key for client-side authentication",
//   required: true,
//   instructions: "Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Settings → API Keys → Copy 'Legacy API keys → anon public' key"
// }

export interface EnvVariable {
  name: string
  description: string
  instructions: string
  required: boolean
}

export function checkMissingEnvVars(): string[] {
  return ENV_VARIABLES.filter(envVar => envVar.required && !process.env[envVar.name]).map(envVar => envVar.name)
}