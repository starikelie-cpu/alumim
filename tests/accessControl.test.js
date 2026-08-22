import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRole,
  isSuperAdmin,
  isAdminRole,
  canAccessAdminDashboard,
  resolveSynagogueId,
  resolveEffectiveSynagogueId,
  filterRecordsBySynagogue,
  filterUsersByAccess
} from '../accessControl.js';

test('normalizes legacy admin role to super admin', () => {
  assert.equal(normalizeRole('admin'), 'super_admin');
  assert.equal(normalizeRole('super_admin'), 'super_admin');
  assert.equal(normalizeRole('synagogue_admin'), 'synagogue_admin');
});

test('super admin can access all data and regular admins are scoped', () => {
  assert.equal(isSuperAdmin('super_admin'), true);
  assert.equal(isAdminRole('synagogue_admin'), true);
  assert.equal(isAdminRole('viewer'), false);
});

test('only super admins can access the admin dashboard', () => {
  assert.equal(canAccessAdminDashboard('super_admin'), true);
  assert.equal(canAccessAdminDashboard('admin'), true);
  assert.equal(canAccessAdminDashboard('synagogue_admin'), false);
  assert.equal(canAccessAdminDashboard('viewer'), false);
});

test('resolveSynagogueId forces a user into their synagogue unless super admin', () => {
  const user = { role: 'synagogue_admin', synagogueId: 'syn-1' };
  assert.equal(resolveSynagogueId(user, 'syn-2'), 'syn-1');
  assert.equal(resolveSynagogueId({ role: 'super_admin' }, 'syn-2'), 'syn-2');
});

test('resolveEffectiveSynagogueId keeps synagogue managers scoped to their own synagogue', () => {
  const manager = { role: 'synagogue_admin', synagogueId: 'syn-1' };
  assert.equal(resolveEffectiveSynagogueId(manager, 'syn-2', 'syn-9'), 'syn-1');
  assert.equal(resolveEffectiveSynagogueId(manager, 'syn-1', 'syn-9'), 'syn-1');
  assert.equal(resolveEffectiveSynagogueId({ role: 'super_admin' }, 'syn-2', 'syn-9'), 'syn-2');
});

test('filters records by synagogue and keeps super admin view unrestricted', () => {
  const records = [
    { id: 1, synagogueId: 'syn-1' },
    { id: 2, synagogueId: 'syn-2' }
  ];
  const user = { role: 'synagogue_admin', synagogueId: 'syn-1' };
  assert.deepEqual(filterRecordsBySynagogue(records, user), [{ id: 1, synagogueId: 'syn-1' }]);
  assert.deepEqual(filterRecordsBySynagogue(records, { role: 'super_admin' }), records);
  assert.deepEqual(filterRecordsBySynagogue(records, { role: 'super_admin' }, 'syn-2'), [{ id: 2, synagogueId: 'syn-2' }]);
  assert.deepEqual(filterRecordsBySynagogue(records, { role: 'super_admin', viewSynagogueId: 'syn-1' }), [{ id: 1, synagogueId: 'syn-1' }]);
});

test('filters users so synagogue admins only see their own synagogue users', () => {
  const users = [
    { username: 'super', role: 'super_admin', synagogueId: null },
    { username: 'a', role: 'synagogue_admin', synagogueId: 'syn-1' },
    { username: 'b', role: 'viewer', synagogueId: 'syn-1' },
    { username: 'c', role: 'viewer', synagogueId: 'syn-2' }
  ];
  const result = filterUsersByAccess(users, { role: 'synagogue_admin', synagogueId: 'syn-1' });
  assert.deepEqual(result.map(u => u.username), ['a', 'b']);
});
