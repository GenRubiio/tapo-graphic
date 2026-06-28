/** Format a canonical "YYYY/MM/DD" key as "DD/MM/YYYY" for display. */
function formatDisplay(dateISO: string): string {
  const [y, m, d] = dateISO.split('/');
  return `${d}/${m}/${y}`;
}

/**
 * Render the day picker into <nav id="calendar">. Selecting a day calls onSelect.
 * Empty day set => "no data" message.
 */
export function renderCalendar(
  days: string[],
  selectedDay: string | null,
  onSelect: (day: string) => void,
): void {
  const nav = document.getElementById('calendar');
  if (!nav) return;
  nav.innerHTML = '';

  if (days.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'calendar__empty';
    empty.textContent = 'No data loaded yet.';
    nav.appendChild(empty);
    return;
  }

  for (const day of days) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'calendar__day';
    const display = formatDisplay(day);
    btn.textContent = display;
    btn.setAttribute('aria-label', `Select day ${display}`);
    const active = day === selectedDay;
    btn.setAttribute('aria-pressed', String(active));
    if (active) btn.classList.add('calendar__day--active');
    btn.addEventListener('click', () => onSelect(day));
    nav.appendChild(btn);
  }
}
