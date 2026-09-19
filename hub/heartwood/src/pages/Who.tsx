import { USERS, setActiveUserId, type UserId } from '@/db/users';
import { APP_NAME } from '@/app/config';
import { BASE } from '@/app/base';

/** First screen on a shared phone or desktop: who is here today? */
export function WhoPage() {
  const choose = (id: UserId) => { setActiveUserId(id); window.location.replace(`${BASE}/`); };
  return (
    <div className="page stack fade-in text-center" style={{ paddingTop: '3rem' }}>
      <h1>{APP_NAME}</h1>
      <p className="text-xl">Who's here today?</p>
      <div className="grid grid-cols-2 gap-4">
        {USERS.map((u) => (
          <button key={u.id} type="button" className="card stack-sm" onClick={() => choose(u.id)} style={{ cursor: 'pointer' }}>
            <Figure bodyType={u.bodyType} />
            <span className="display text-2xl block">{u.label}</span>
          </button>
        ))}
      </div>
      <p className="muted text-sm">Each of you has your own plan, tree and sticker book on this device.</p>
    </div>
  );
}

function Figure({ bodyType }: { bodyType: 'woman' | 'man' }) {
  const w = bodyType === 'woman';
  return (
    <svg viewBox="0 0 100 160" width="90" height="144" className="mx-auto" aria-hidden="true">
      <circle cx="50" cy="22" r="14" fill="var(--color-stone-200)" />
      <path d={w
        ? 'M50 36 q-13 3 -15 22 q-4 10 -9 22 q6 4 9 -2 l-1 14 q-2 10 -2 20 l7 42 h11 l0 -46 l0 46 h11 l7 -42 q0 -10 -2 -20 l-1 -14 q3 6 9 2 q-5 -12 -9 -22 q-2 -19 -15 -22 z'
        : 'M50 36 q-24 2 -27 20 q-3 12 -5 26 q6 3 9 -3 l1 -12 q0 12 3 22 l3 42 h13 l3 -44 l3 44 h13 l3 -42 q3 -10 3 -22 l1 12 q3 6 9 3 q-2 -14 -5 -26 q-3 -18 -27 -20 z'} fill="var(--color-fern-400)" />
    </svg>
  );
}
