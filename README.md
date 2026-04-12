// ── Category definitions ─────────────────────────
const CATEGORIES = [
  { key: 'main',  label: 'Main Dishes',   icon: '🍖', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  { key: 'sides', label: 'Side Dishes',   icon: '🥗', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'bev',   label: 'Beverages',     icon: '🥤', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'misc',  label: 'Miscellaneous', icon: '🎉', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
];

// Avatar palette — cycles by invitee index
const AVATAR_PALETTE = ['#4f46e5','#0891b2','#16a34a','#b45309','#7c3aed','#c026d3','#dc2626','#0369a1'];
const avatarColor = idx => AVATAR_PALETTE[idx % AVATAR_PALETTE.length];

// ── DOM references ───────────────────────────────
const overlay           = document.getElementById('overlay');
const eventForm         = document.getElementById('eventForm');
const eventsGrid        = document.getElementById('eventsGrid');
const emptyState        = document.getElementById('emptyState');
const eventCount        = document.getElementById('eventCount');
const toast             = document.getElementById('toast');
const toastMsg          = document.getElementById('toastMsg');
const sharedToggleBtn   = document.getElementById('sharedToggleBtn');
const volunteerSection  = document.getElementById('volunteerSection');
const volCategoryBlocks = document.getElementById('volCategoryBlocks');
const inviteeFormList   = document.getElementById('inviteeFormList');
const newInviteeName    = document.getElementById('newInviteeName');
const newInviteePhone   = document.getElementById('newInviteePhone');
const inviteNameSection = document.getElementById('inviteNameSection');
const inviteDistSection = document.getElementById('inviteDistanceSection');
const distanceSelect    = document.getElementById('distanceRadiusSelect');

// ── App state ────────────────────────────────────
let events         = [];
let isShared       = false;
let formItems      = { main: [], sides: [], bev: [], misc: [] };
let catOpen        = { main: false, sides: false, bev: false, misc: false };
let formInvitees   = [];    // [{ name, phone }]
let inviteMode     = 'name'; // 'name' | 'distance'
let distanceRadius = 10;
let rsvpCollapsed  = {};    // { [eventId]: boolean }

// ── Invite mode switch ───────────────────────────
function switchInviteMode(mode) {
  inviteMode = mode;
  document.getElementById('inviteModeNameBtn').classList.toggle('active', mode === 'name');
  document.getElementById('inviteModeDistanceBtn').classList.toggle('active', mode === 'distance');
  inviteNameSection.style.display = mode === 'name'     ? 'flex'  : 'none';
  inviteDistSection.style.display = mode === 'distance' ? 'block' : 'none';
}

// ── Invitees — name mode ─────────────────────────
function addInvitee() {
  const name  = newInviteeName.value.trim();
  const phone = newInviteePhone.value.trim();
  if (!name) return;
  formInvitees.push({ name, phone });
  newInviteeName.value  = '';
  newInviteePhone.value = '';
  renderInviteesInForm();
  newInviteeName.focus();
}

function removeInvitee(idx) {
  formInvitees.splice(idx, 1);
  renderInviteesInForm();
}

function renderInviteesInForm() {
  if (formInvitees.length === 0) { inviteeFormList.innerHTML = ''; return; }
  inviteeFormList.innerHTML = `
    <div class="invitee-form-list">
      ${formInvitees.map((inv, i) => `
        <div class="invitee-form-item">
          <div class="invitee-form-avatar" style="background:${avatarColor(i)};">
            ${escapeHtml(inv.name.charAt(0).toUpperCase())}
          </div>
          <span class="invitee-form-name">${escapeHtml(inv.name)}</span>
          ${inv.phone ? `<span class="invitee-form-phone">📞 ${escapeHtml(inv.phone)}</span>` : ''}
          <button type="button" class="btn-remove-item"
            onclick="removeInvitee(${i})" title="Remove">✕</button>
        </div>`).join('')}
    </div>`;
}

// ── Category blocks (form) ───────────────────────
function buildCategoryBlocks() {
  volCategoryBlocks.innerHTML = CATEGORIES.map(cat => `
    <div class="vol-category" id="volCat-${cat.key}" style="border-color:${cat.border};">
      <div class="vol-cat-header" id="volCatHeader-${cat.key}"
           onclick="toggleCat('${cat.key}')" style="background:${cat.bg};">
        <div class="vol-cat-left">
          <span class="vol-cat-icon">${cat.icon}</span>
          <span class="vol-cat-name" style="color:${cat.color};">${cat.label}</span>
          <span class="vol-cat-count" id="volCatCount-${cat.key}">0</span>
        </div>
        <span class="vol-cat-chevron">▼</span>
      </div>
      <div class="vol-cat-body" id="volCatBody-${cat.key}">
        <div class="vol-item-list" id="volItemList-${cat.key}"></div>
        <p class="vol-cat-empty" id="volCatEmpty-${cat.key}">No items yet — add one below.</p>
        <div class="vol-add-row">
          <input type="text" id="volInput-${cat.key}"
            placeholder="Add a ${cat.label.toLowerCase()} item…" maxlength="80"
            onkeydown="if(event.key==='Enter'){event.preventDefault();addItem('${cat.key}');}" />
          <button type="button" class="btn-add-item"
            onclick="addItem('${cat.key}')"
            style="background:${cat.color};">+ Add</button>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleCat(key) {
  catOpen[key] = !catOpen[key];
  document.getElementById(`volCatHeader-${key}`).classList.toggle('open', catOpen[key]);
  document.getElementById(`volCatBody-${key}`).classList.toggle('open', catOpen[key]);
  if (catOpen[key]) document.getElementById(`volInput-${key}`).focus();
}

function addItem(key) {
  const input = document.getElementById(`volInput-${key}`);
  const label = input.value.trim();
  if (!label) return;
  formItems[key].push({ label });
  input.value = '';
  renderCatItems(key);
  input.focus();
}

function removeItem(key, idx) {
  formItems[key].splice(idx, 1);
  renderCatItems(key);
}

function renderCatItems(key) {
  const list    = document.getElementById(`volItemList-${key}`);
  const empty   = document.getElementById(`volCatEmpty-${key}`);
  const counter = document.getElementById(`volCatCount-${key}`);
  const items   = formItems[key];

  counter.textContent = items.length;
  counter.classList.toggle('has-items', items.length > 0);
  empty.style.display = items.length ? 'none' : 'block';

  list.innerHTML = items.map((item, i) => `
    <div class="vol-item-row">
      <input type="text" value="${escapeHtml(item.label)}"
        oninput="formItems['${key}'][${i}].label = this.value.trim()"
        placeholder="Item description" />
      <button type="button" class="btn-remove-item"
        onclick="removeItem('${key}', ${i})" title="Remove">✕</button>
    </div>
  `).join('');
}

// ── Shared Responsibility Toggle ─────────────────
sharedToggleBtn.addEventListener('click', () => {
  isShared = !isShared;
  sharedToggleBtn.classList.toggle('active', isShared);
  volunteerSection.classList.toggle('visible', isShared);
});

// ── Modal helpers ────────────────────────────────
function openModal() {
  overlay.classList.add('open');
  document.getElementById('eventName').focus();
}

function closeModal() {
  overlay.classList.remove('open');
  eventForm.reset();
  clearErrors();
  isShared       = false;
  formItems      = { main: [], sides: [], bev: [], misc: [] };
  catOpen        = { main: false, sides: false, bev: false, misc: false };
  formInvitees   = [];
  inviteeFormList.innerHTML = '';
  sharedToggleBtn.classList.remove('active');
  volunteerSection.classList.remove('visible');
  buildCategoryBlocks();
  // Reset invite mode to name
  inviteMode     = 'name';
  distanceRadius = 10;
  distanceSelect.value = '10';
  switchInviteMode('name');
}

document.getElementById('openModalBtn').addEventListener('click', openModal);
document.getElementById('openModalBtn2').addEventListener('click', openModal);
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Validation ───────────────────────────────────
function clearErrors() {
  document.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
}

function validate() {
  clearErrors();
  let valid = true;
  [
    { id: 'eventName',     field: 'field-name' },
    { id: 'eventDate',     field: 'field-date' },
    { id: 'eventTime',     field: 'field-time' },
    { id: 'eventLocation', field: 'field-location' },
    { id: 'eventReason',   field: 'field-reason' },
  ].forEach(({ id, field }) => {
    if (!document.getElementById(id).value.trim()) {
      document.getElementById(field).classList.add('invalid');
      valid = false;
    }
  });
  return valid;
}

// ── Form submit ──────────────────────────────────
eventForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!validate()) return;

  const categories = isShared
    ? CATEGORIES
        .map(cat => ({
          key:    cat.key,
          label:  cat.label,
          icon:   cat.icon,
          color:  cat.color,
          bg:     cat.bg,
          border: cat.border,
          items: formItems[cat.key]
            .filter(it => it.label)
            .map(it => ({ label: it.label, claimedBy: null }))
        }))
        .filter(cat => cat.items.length > 0)
    : [];

  const event = {
    id:             Date.now(),
    name:           document.getElementById('eventName').value.trim(),
    date:           document.getElementById('eventDate').value,
    time:           document.getElementById('eventTime').value,
    location:       document.getElementById('eventLocation').value.trim(),
    reason:         document.getElementById('eventReason').value.trim(),
    shared:         isShared,
    categories,
    inviteMode,
    distanceRadius: inviteMode === 'distance' ? distanceRadius : null,
    invitees:       inviteMode === 'name'
                      ? formInvitees
                          .filter(i => i.name)
                          .map(i => ({ name: i.name, phone: i.phone, rsvp: 'pending' }))
                      : [], // distance events fill their list when people self-RSVP
    allergies:      [],
    lastUpdated:    null,
  };

  events.unshift(event);
  renderEvents();
  closeModal();
  showToast(`"${event.name}" has been created!`);
});

// ── RSVP collapse toggle ─────────────────────────
function toggleRsvpCollapse(eventId) {
  rsvpCollapsed[eventId] = !rsvpCollapsed[eventId];
  renderEvents();
}

// ── Guest "Going" gate ───────────────────────────
// Returns true if the name matches a going invitee, OR if the event has no invitee list.
function isGuestGoing(ev, name) {
  if (!ev.invitees || ev.invitees.length === 0) return true;
  return ev.invitees.some(
    i => i.name.toLowerCase() === name.toLowerCase() && i.rsvp === 'accepted'
  );
}

// ── RSVP — name mode ─────────────────────────────
function rsvpUpdate(eventId, inviteeIdx, status) {
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;

  const name = ev.invitees[inviteeIdx].name;
  ev.invitees[inviteeIdx].rsvp = status;

  // When declining, release volunteer items and remove from allergy list
  if (status === 'declined') {
    if (ev.categories) {
      ev.categories.forEach(cat => {
        cat.items.forEach(item => {
          if (item.claimedBy && item.claimedBy.toLowerCase() === name.toLowerCase()) {
            item.claimedBy = null;
          }
        });
      });
    }
    if (ev.allergies) {
      ev.allergies = ev.allergies.filter(
        a => a.name.toLowerCase() !== name.toLowerCase()
      );
    }
  }

  ev.lastUpdated = new Date().toISOString();
  renderEvents();
  showToast(status === 'accepted' ? `${name} is going! 🎉` : `${name} can't make it.`);
}

function rsvpReset(eventId, inviteeIdx) {
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;
  ev.invitees[inviteeIdx].rsvp = 'pending';
  renderEvents();
}

// ── RSVP — distance mode (self-serve) ────────────
function rsvpDistanceAttend(eventId) {
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;

  const name = prompt('Enter your name to RSVP:');
  if (!name || !name.trim()) return;

  const already = ev.invitees.find(i => i.name.toLowerCase() === name.trim().toLowerCase());
  if (already) {
    alert(`${name.trim()} is already on the guest list as "${already.rsvp === 'accepted' ? 'Going' : already.rsvp === 'declined' ? 'Declined' : 'Pending'}".`);
    return;
  }

  const phone = prompt('Your phone number (optional — press Cancel to skip):') ?? '';

  ev.invitees.push({ name: name.trim(), phone: phone.trim(), rsvp: 'accepted' });
  ev.lastUpdated = new Date().toISOString();
  renderEvents();
  showToast(`${name.trim()} is going! 🎉`);
}

// ── Add allergy ──────────────────────────────────
function addAllergy(eventId) {
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;

  const name = prompt('Your name:');
  if (!name || !name.trim()) return;

  if (!isGuestGoing(ev, name.trim())) {
    alert(`Only guests marked as "Going" can add allergies.\n\nPlease RSVP as "Going" first.`);
    return;
  }

  const allergy = prompt(`${name.trim()}, what are you allergic to?\n(e.g. Peanuts, Shellfish, Gluten)`);
  if (!allergy || !allergy.trim()) return;

  const tags = allergy.split(',').map(a => a.trim()).filter(Boolean);
  ev.allergies.push({ name: name.trim(), tags });
  ev.lastUpdated = new Date().toISOString();
  renderEvents();
  showToast(`⚠️ Allergy noted for ${name.trim()}.`);
}

// ── Claim a volunteer item ───────────────────────
function claimItem(eventId, catIdx, itemIdx) {
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;
  const item = ev.categories[catIdx].items[itemIdx];
  if (item.claimedBy) return;

  const name = prompt(`Enter your name to volunteer for:\n"${item.label}"`);
  if (!name || !name.trim()) return;

  if (!isGuestGoing(ev, name.trim())) {
    alert(`Only guests marked as "Going" can sign up for items.\n\nPlease RSVP as "Going" first.`);
    return;
  }

  item.claimedBy = name.trim();
  ev.lastUpdated = new Date().toISOString();
  renderEvents();
  showToast(`${name.trim()} signed up for "${item.label}"!`);
}

// ── Delete event ─────────────────────────────────
function deleteEvent(id) {
  events = events.filter(ev => ev.id !== id);
  renderEvents();
  showToast('Event removed.');
}

// ── Render helpers ───────────────────────────────
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatTime(timeStr) {
  const [h, min] = timeStr.split(':');
  const d = new Date();
  d.setHours(+h, +min);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatTimestamp(iso) {
  const d    = new Date(iso);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${time}, ${date}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Render: RSVP section ─────────────────────────
function renderRSVPCard(ev) {
  const collapsed = !!rsvpCollapsed[ev.id];

  // ── Distance mode: self-serve banner ────────────
  if (ev.inviteMode === 'distance') {
    const going    = ev.invitees.filter(i => i.rsvp === 'accepted').length;
    const declined = ev.invitees.filter(i => i.rsvp === 'declined').length;
    const pending  = ev.invitees.filter(i => i.rsvp === 'pending').length;

    const countsHtml = `
      ${going    ? `<span class="rsvp-chip rsvp-chip-going">✓ ${going} Going</span>` : ''}
      ${declined ? `<span class="rsvp-chip rsvp-chip-declined">✗ ${declined} Declined</span>` : ''}
      ${pending  ? `<span class="rsvp-chip rsvp-chip-pending">⏳ ${pending} Awaiting</span>` : ''}`;

    const listHtml = ev.invitees.length > 0
      ? ev.invitees.map((inv, i) => {
          const cls      = inv.rsvp === 'accepted' ? 'going' : inv.rsvp === 'declined' ? 'declined' : '';
          const initials = inv.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          return `
            <div class="rsvp-item ${cls}">
              <div class="rsvp-avatar" style="background:${avatarColor(i)};">${escapeHtml(initials)}</div>
              <div class="rsvp-name-block">
                <span class="rsvp-name">${escapeHtml(inv.name)}</span>
                ${inv.phone ? `<span class="rsvp-phone">📞 ${escapeHtml(inv.phone)}</span>` : ''}
              </div>
              <div class="rsvp-actions">
                <span class="rsvp-status ${inv.rsvp === 'accepted' ? 'rsvp-status-going' : 'rsvp-status-declined'}">
                  ${inv.rsvp === 'accepted' ? '✓ Going' : '✗ Declined'}
                </span>
              </div>
            </div>`;
        }).join('')
      : `<p style="font-size:0.82rem;color:var(--muted);font-style:italic;">No one has RSVP'd yet.</p>`;

    return `
      <div class="distance-invite-banner">
        <span class="distance-invite-text">📍 Open to everyone within <strong>${ev.distanceRadius} mile${ev.distanceRadius !== 1 ? 's' : ''}</strong></span>
        <button class="btn-rsvp-distance" onclick="rsvpDistanceAttend(${ev.id})">+ RSVP to Attend</button>
      </div>
      <div class="card-rsvp-section">
        <div class="rsvp-header">
          <button class="rsvp-title-btn" onclick="toggleRsvpCollapse(${ev.id})">
            <span class="rsvp-title">🎉 Guest List</span>
            <span class="rsvp-chevron ${collapsed ? 'collapsed' : ''}">▼</span>
          </button>
          <div class="rsvp-counts">${countsHtml}</div>
        </div>
        <div class="rsvp-list-wrapper ${collapsed ? 'collapsed' : ''}">
          <div class="rsvp-list">${listHtml}</div>
        </div>
      </div>`;
  }

  // ── Name mode: pre-defined guest list ───────────
  if (!ev.invitees || ev.invitees.length === 0) return '';

  const going    = ev.invitees.filter(i => i.rsvp === 'accepted').length;
  const declined = ev.invitees.filter(i => i.rsvp === 'declined').length;
  const pending  = ev.invitees.filter(i => i.rsvp === 'pending').length;

  const countsHtml = `
    ${going    ? `<span class="rsvp-chip rsvp-chip-going">✓ ${going} Going</span>` : ''}
    ${declined ? `<span class="rsvp-chip rsvp-chip-declined">✗ ${declined} Declined</span>` : ''}
    ${pending  ? `<span class="rsvp-chip rsvp-chip-pending">⏳ ${pending} Awaiting</span>` : ''}`;

  const listHtml = ev.invitees.map((inv, i) => {
    const cls      = inv.rsvp === 'accepted' ? 'going' : inv.rsvp === 'declined' ? 'declined' : '';
    const initials = inv.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    let actions = '';
    if (inv.rsvp === 'pending') {
      actions = `
        <div class="rsvp-actions">
          <button class="btn-rsvp btn-rsvp-going"
            onclick="rsvpUpdate(${ev.id}, ${i}, 'accepted')">✓ Going</button>
          <button class="btn-rsvp btn-rsvp-decline"
            onclick="rsvpUpdate(${ev.id}, ${i}, 'declined')">✗ Can't Make It</button>
        </div>`;
    } else if (inv.rsvp === 'accepted') {
      actions = `
        <div class="rsvp-actions">
          <span class="rsvp-status rsvp-status-going">✓ Going</span>
          <button class="btn-rsvp-change" onclick="rsvpReset(${ev.id}, ${i})">Change</button>
        </div>`;
    } else {
      actions = `
        <div class="rsvp-actions">
          <span class="rsvp-status rsvp-status-declined">✗ Declined</span>
          <button class="btn-rsvp-change" onclick="rsvpReset(${ev.id}, ${i})">Change</button>
        </div>`;
    }

    return `
      <div class="rsvp-item ${cls}">
        <div class="rsvp-avatar" style="background:${avatarColor(i)};">${escapeHtml(initials)}</div>
        <div class="rsvp-name-block">
          <span class="rsvp-name">${escapeHtml(inv.name)}</span>
          ${inv.phone ? `<span class="rsvp-phone">📞 ${escapeHtml(inv.phone)}</span>` : ''}
        </div>
        ${actions}
      </div>`;
  }).join('');

  return `
    <div class="card-rsvp-section">
      <div class="rsvp-header">
        <button class="rsvp-title-btn" onclick="toggleRsvpCollapse(${ev.id})">
          <span class="rsvp-title">🎉 Guest List</span>
          <span class="rsvp-chevron ${collapsed ? 'collapsed' : ''}">▼</span>
        </button>
        <div class="rsvp-counts">${countsHtml}</div>
      </div>
      <div class="rsvp-list-wrapper ${collapsed ? 'collapsed' : ''}">
        <div class="rsvp-list">${listHtml}</div>
      </div>
    </div>`;
}

// ── Render: Allergy section ──────────────────────
function renderAllergyCard(ev) {
  const hasAllergies = ev.allergies && ev.allergies.length > 0;

  const listHtml = hasAllergies
    ? `<div class="allergy-list">
        ${ev.allergies.map(a => `
          <div class="allergy-item">
            <span class="allergy-item-name">🚫 ${escapeHtml(a.name)}:</span>
            <div class="allergy-tags">
              ${a.tags.map(t => `<span class="allergy-tag">${escapeHtml(t)}</span>`).join('')}
            </div>
          </div>`).join('')}
       </div>`
    : `<p class="allergy-none-msg">No allergies reported yet.</p>`;

  return `
    <div class="card-allergy-section">
      <div class="allergy-header">
        <div class="allergy-title"><span class="warn-icon">⚠️</span> Allergy Alert</div>
        <button class="btn-add-allergy" onclick="addAllergy(${ev.id})">+ Add Allergy</button>
      </div>
      ${listHtml}
    </div>`;
}

// ── Render: Volunteer section ────────────────────
function renderVolunteerCard(ev) {
  if (!ev.shared || ev.categories.length === 0) return '';

  const allItems  = ev.categories.flatMap(cat => cat.items);
  const total     = allItems.length;
  const claimed   = allItems.filter(it => it.claimedBy).length;
  const pct       = total ? Math.round((claimed / total) * 100) : 0;
  const allFilled = total > 0 && claimed === total;

  const categoriesHtml = ev.categories.map((cat, ci) => {
    const itemsHtml = cat.items.map((item, ii) => {
      if (item.claimedBy) {
        return `<div class="card-volunteer-item claimed">
          <span class="item-label">${escapeHtml(item.label)}</span>
          <span class="item-claimer">✅ ${escapeHtml(item.claimedBy)}</span>
        </div>`;
      }
      return `<div class="card-volunteer-item">
        <span class="item-label">${escapeHtml(item.label)}</span>
        <button class="btn-volunteer" onclick="claimItem(${ev.id},${ci},${ii})">Volunteer →</button>
      </div>`;
    }).join('');

    return `
      <div class="card-cat-group">
        <div class="card-cat-label" style="color:${cat.color};">
          <span>${cat.icon}</span><span>${escapeHtml(cat.label)}</span>
        </div>
        <div class="card-volunteer-list">${itemsHtml}</div>
      </div>`;
  }).join('');

  const completeBanner = allFilled ? `
    <div class="volunteer-complete-banner">
      🎉 All items are filled — nothing more needed!
    </div>` : '';

  return `
    <div class="card-volunteer-section">
      <div class="card-volunteer-title">🙋 Volunteer Items
        <span style="font-weight:400;color:var(--muted);text-transform:none;
                     letter-spacing:0;font-size:0.76rem;">(${claimed}/${total} filled)</span>
      </div>
      ${completeBanner}
      <div class="volunteer-progress">
        <div class="volunteer-progress-bar" style="width:${pct}%;${allFilled ? 'background:linear-gradient(90deg,#4ade80,#16a34a);' : ''}"></div>
      </div>
      ${categoriesHtml}
    </div>`;
}

// ── Render all events ────────────────────────────
function renderEvents() {
  if (events.length === 0) {
    eventsGrid.style.display = 'none';
    emptyState.style.display = 'block';
    eventCount.textContent   = 'No events yet';
    return;
  }

  emptyState.style.display = 'none';
  eventsGrid.style.display = 'grid';
  eventCount.textContent   = `${events.length} event${events.length !== 1 ? 's' : ''} planned`;

  eventsGrid.innerHTML = events.map(ev => {
    const updatedBadge = ev.lastUpdated
      ? `<span class="event-badge-updated">🕐 Updated @ ${formatTimestamp(ev.lastUpdated)}</span>`
      : '';
    const distanceBadge = ev.inviteMode === 'distance'
      ? `<span class="event-badge" style="background:#dbeafe;color:#1d4ed8;">📍 ${ev.distanceRadius}mi Open</span>`
      : '';

    return `
      <div class="event-card" id="card-${ev.id}">
        <div class="event-card-header">
          <div class="badge-row">
            <span class="event-badge">Upcoming</span>
            ${ev.shared ? '<span class="event-badge-shared">🤝 Shared</span>' : ''}
            ${distanceBadge}
            ${updatedBadge}
          </div>
          <button class="btn btn-danger" onclick="deleteEvent(${ev.id})" title="Delete">&#128465;</button>
        </div>

        <div class="event-title">${escapeHtml(ev.name)}</div>

        <div class="event-meta">
          <div class="meta-row"><span class="icon">📅</span><span>${formatDate(ev.date)}</span></div>
          <div class="meta-row"><span class="icon">🕐</span><span>${formatTime(ev.time)}</span></div>
          <div class="meta-row"><span class="icon">📍</span><span>${escapeHtml(ev.location)}</span></div>
          <div class="meta-row"><span class="icon">🎯</span><span>${escapeHtml(ev.reason)}</span></div>
        </div>

        ${renderAllergyCard(ev)}
        ${renderRSVPCard(ev)}
        ${renderVolunteerCard(ev)}

        <div class="event-card-footer">
          <button class="btn btn-ghost" style="font-size:0.82rem;padding:6px 14px;">View Details</button>
        </div>
      </div>`;
  }).join('');
}

// ── Toast ────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toastMsg.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ── Init ─────────────────────────────────────────
// Prevent past dates from being selected
document.getElementById('eventDate').min = new Date().toISOString().split('T')[0];

buildCategoryBlocks();
renderEvents();
