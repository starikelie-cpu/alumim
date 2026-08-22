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
  // For viewers (guests/worshippers), if they have a synagogueId set, use it
  if (normalizeRole(user.role) === 'viewer' && user.synagogueId) {
    return user.synagogueId;
  }
  // For synagogue_admin, always use their synagogueId
  if (normalizeRole(user.role) === 'synagogue_admin') {
    return user.synagogueId || null;
  }
  return user.synagogueId || fallbackSynagogueId || null;
}

export function resolveEffectiveSynagogueId(user, requestedSynagogueId = null, fallbackSynagogueId = null) {
  if (!user) return requestedSynagogueId || fallbackSynagogueId || null;
  if (isSuperAdmin(user.role)) return requestedSynagogueId || fallbackSynagogueId || null;
  
  // For synagogue admin, always use their synagogueId - ignore requested and fallback
  if (normalizeRole(user.role) === 'synagogue_admin') {
    return user.synagogueId || null;
  }
  
  return user.synagogueId || requestedSynagogueId || fallbackSynagogueId || null;
}

export function filterRecordsBySynagogue(records, user, fallbackSynagogueId = null) {
  if (!Array.isArray(records)) return [];

  const role = normalizeRole(user?.role);

  const explicitSynagogueId = user?.viewSynagogueId
    ? String(user.viewSynagogueId)
    : fallbackSynagogueId
      ? String(fallbackSynagogueId)
      : null;

  // Super admin sees everything
  if (role === 'super_admin') {
    if (!explicitSynagogueId) return records;
    return records.filter((record) => {
      const recordSynagogueId = record && record.synagogueId ? String(record.synagogueId) : null;
      return recordSynagogueId === explicitSynagogueId;
    });
  }

  const synagogueId = resolveSynagogueId(user, fallbackSynagogueId);

  // No synagogueId and not super_admin → no access
  if (!synagogueId) return [];

  // Filter: only records belonging to the user's synagogue
  // Records without synagogueId are NOT shown to synagogue_admin (security)
  // But viewers (guests) should see records for their selected synagogue
  return records.filter((record) => {
    const recordSynagogueId = record && record.synagogueId ? String(record.synagogueId) : null;
    return recordSynagogueId === synagogueId;
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
