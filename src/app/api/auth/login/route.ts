import { checkLoginRate, login } from '@/lib/auth';
import { HttpError, json, preflight, readJson, run } from '@/lib/http';
import { loginSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

export async function POST(req: Request) {
  return run(req, async () => {
    checkLoginRate(req);
    const { username, password } = loginSchema.parse(await readJson(req));
    const session = await login(username, password);
    // Same message for unknown user and wrong password, so usernames can't be probed.
    if (!session) throw new HttpError(401, 'Usuario o contraseña incorrectos.');
    return json(req, session);
  });
}
