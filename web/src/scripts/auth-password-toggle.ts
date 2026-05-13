/**
 * 密码行右侧眼睛：password ↔ text，同步图标 invisible / visible
 */
const ICON_HIDDEN = '/icn_backend_invisible.svg';
const ICON_VISIBLE = '/icn_backend_visible.svg';

export function initPasswordVisibilityToggles(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-password-toggle]').forEach((wrap) => {
    const input = wrap.querySelector<HTMLInputElement>('input[type="password"], input[type="text"]');
    const btn = wrap.querySelector<HTMLButtonElement>('.auth-toggle-password');
    const img = btn?.querySelector<HTMLImageElement>('img');
    if (!input || !btn || !img) return;

    const labelShow = btn.dataset.labelShow ?? 'Show password';
    const labelHide = btn.dataset.labelHide ?? 'Hide password';

    const sync = () => {
      const visible = input.type === 'text';
      img.src = visible ? ICON_VISIBLE : ICON_HIDDEN;
      btn.setAttribute('aria-label', visible ? labelHide : labelShow);
    };

    btn.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      sync();
    });

    sync();
  });
}
