export function normalizeRole(role) {
  if (!role) return 'viewer';
  const normalized = String(role).trim().toLowerCase();
  if (normalized === 'admin') return 'super_admin';
  if (normalized === 'superadmin' || normalized === 'super_admin') return 'super_admin';
  if (normalized === 'synagogue_admin' || normalized === 'synagogue-admin') return 'synagogue_admin';
  if (normalized === 'manager' || normalized === 'administer') return 'synagogue_admin';
  return normalized;
}

export function isSuperAdmin(role) {
  return normalizeRole(role) === 'super_admin';
}

export function isAdminRole(role) {
  const normalized = normalizeRole(role);
  return normalized === 'super_admin' || normalized === 'synagogue_admin';
}

export function canAccessAdminDashboard(role) {
  return isSuperAdmin(role) || normalizeRole(role) === 'admin';
}

export function resolveSynagogueId(user, fallbackSynagogueId = null) {
  if (!user) return fallbackSynagogueId || null;
  if (isSuperAdmin(user.role)) return fallbackSynagogueId || null;
  return user.synagogueId || fallbackSynagogueId || null;
}

export function resolveEffectiveSynagogueId(user, requestedSynagogueId = null, fallbackSynagogueId = null) {
  if (!user) return requestedSynagogueId || fallbackSynagogueId || null;
  if (isSuperAdmin(user.role)) return requestedSynagogueId || fallbackSynagogueId || null;
  return user.synagogueId || requestedSynagogueId || fallbackSynagogueId || null;
}

export function filterRecordsBySynagogue(records, user, fallbackSynagogueId = null) {
  if (!Array.isArray(records)) return [];
  const synagogueId = resolveSynagogueId(user, fallbackSynagogueId);
  if (!synagogueId) return records;

  return records.filter((record) => {
    const recordSynagogueId = record && record.synagogueId ? String(record.synagogueId) : null;
    return !recordSynagogueId || recordSynagogueId === synagogueId;
  });
}

export function filterUsersByAccess(users, user) {
  if (!Array.isArray(users)) return [];
  if (!user) return users;
  if (isSuperAdmin(user.role)) return users;
  const synagogueId = user.synagogueId || null;
  if (!synagogueId) return [];

  return users.filter((candidate) => {
    const candidateSynagogueId = candidate && candidate.synagogueId ? String(candidate.synagogueId) : null;
    return candidateSynagogueId === synagogueId;
  });
}
