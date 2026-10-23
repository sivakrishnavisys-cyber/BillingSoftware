export function searchStaff(staff = [], query = '') {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return staff;
  return staff.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
  );
}

export function saveStaff(state, staffData, existingId = null) {
  const name = String(staffData.name || '').trim();
  if (!name) throw new Error('Staff name is required.');

  const staff = [...(state.staff || [])];
  const now = new Date().toISOString().slice(0, 10);

  if (existingId) {
    const idx = staff.findIndex((s) => s.id === existingId);
    if (idx < 0) throw new Error('Staff member not found.');

    staff[idx] = {
      ...staff[idx],
      name,
      role: staffData.role || 'Cashier',
      phone: String(staffData.phone || '').trim(),
      email: String(staffData.email || '').trim(),
      shift: staffData.shift || 'Full Day',
      status: staffData.status || 'Active',
      pin: staffData.pin || staff[idx].pin || '1234',
    };
  } else {
    const nextSeq = (state.meta?.staffSeq || staff.length) + 1;
    const newStaff = {
      id: `stf-${nextSeq}`,
      name,
      role: staffData.role || 'Cashier',
      phone: String(staffData.phone || '').trim(),
      email: String(staffData.email || '').trim(),
      shift: staffData.shift || 'Full Day',
      status: staffData.status || 'Active',
      pin: staffData.pin || '1234',
      joinedDate: now,
      monthlySalesCount: 0,
    };
    staff.push(newStaff);
  }

  return {
    ...state,
    staff,
    meta: {
      ...state.meta,
      staffSeq: Math.max(state.meta?.staffSeq || 0, staff.length),
    },
  };
}

export function deleteStaff(state, staffId) {
  const staff = (state.staff || []).filter((s) => s.id !== staffId);
  return { ...state, staff };
}

export function toggleStaffStatus(state, staffId) {
  const staff = (state.staff || []).map((s) => {
    if (s.id !== staffId) return s;
    return { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' };
  });
  return { ...state, staff };
}
