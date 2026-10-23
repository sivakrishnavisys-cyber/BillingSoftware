import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  UserCheck,
  Users,
  UserX,
  Warehouse,
  X,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import { useStore } from '../context/StoreContext';
import {
  deleteStaff,
  saveStaff,
  searchStaff,
  toggleStaffStatus,
} from '../services/staffService';
import { formatDate } from '../utils/dateUtils';

const ROLE_OPTIONS = [
  'Store Manager',
  'Cashier',
  'Stock Keeper',
  'Administrator',
  'Sales Associate',
];

const SHIFT_OPTIONS = [
  'Full Day (09:00 - 21:00)',
  'Morning (08:00 - 16:00)',
  'Evening (14:00 - 22:00)',
  'Night (21:00 - 06:00)',
];

function getRoleIcon(role) {
  switch (String(role).toLowerCase()) {
    case 'store manager':
    case 'administrator':
    case 'admin':
      return Shield;
    case 'stock keeper':
      return Warehouse;
    case 'cashier':
    case 'sales associate':
    default:
      return ShoppingCart;
  }
}

function getRoleBadgeClass(role) {
  switch (String(role).toLowerCase()) {
    case 'store manager':
      return 'badge-purple';
    case 'administrator':
    case 'admin':
      return 'badge-red';
    case 'stock keeper':
      return 'badge-orange';
    case 'cashier':
      return 'badge-blue';
    default:
      return 'badge-gray';
  }
}

export default function Staff() {
  const { staff = [], update, showToast } = useStore();

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [revealedPins, setRevealedPins] = useState({});

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    role: 'Cashier',
    phone: '',
    email: '',
    shift: 'Full Day (09:00 - 21:00)',
    pin: '1234',
    status: 'Active',
  });
  const [formError, setFormError] = useState('');

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    let list = searchStaff(staff, query);

    if (roleFilter !== 'all') {
      list = list.filter((s) => s.role.toLowerCase() === roleFilter.toLowerCase());
    }

    if (statusFilter !== 'all') {
      list = list.filter((s) => s.status.toLowerCase() === statusFilter.toLowerCase());
    }

    return list;
  }, [staff, query, roleFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = staff.length;
    const activeCount = staff.filter((s) => s.status === 'Active').length;
    const cashierCount = staff.filter((s) => s.role.toLowerCase().includes('cashier') && s.status === 'Active').length;
    const managersCount = staff.filter((s) =>
      ['store manager', 'administrator', 'admin'].includes(s.role.toLowerCase())
    ).length;

    return { total, activeCount, cashierCount, managersCount };
  }, [staff]);

  const togglePinReveal = (id) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      role: 'Cashier',
      phone: '',
      email: '',
      shift: 'Full Day (09:00 - 21:00)',
      pin: String(Math.floor(1000 + Math.random() * 9000)),
      status: 'Active',
    });
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (member) => {
    setEditingStaff(member);
    setFormData({
      name: member.name || '',
      role: member.role || 'Cashier',
      phone: member.phone || '',
      email: member.email || '',
      shift: member.shift || 'Full Day (09:00 - 21:00)',
      pin: member.pin || '1234',
      status: member.status || 'Active',
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleSaveStaff = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Staff name is required.');
      return;
    }
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (formData.pin && !/^\d{4}$/.test(formData.pin.trim())) {
      setFormError('PIN must be exactly 4 digits.');
      return;
    }

    try {
      update((prev) => saveStaff(prev, formData, editingStaff?.id));
      showToast(
        editingStaff
          ? `Staff profile for "${formData.name}" updated successfully.`
          : `Staff member "${formData.name}" added successfully.`
      );
      setFormOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save staff member.');
    }
  };

  const handleToggleStatus = (member) => {
    update((prev) => toggleStaffStatus(prev, member.id));
    const newStatus = member.status === 'Active' ? 'Inactive' : 'Active';
    showToast(`Staff member "${member.name}" marked as ${newStatus}.`);
  };

  const handleDeleteStaff = () => {
    if (!deleteTarget) return;
    update((prev) => deleteStaff(prev, deleteTarget.id));
    showToast(`Staff member "${deleteTarget.name}" deleted.`, 'danger');
    setDeleteTarget(null);
  };

  return (
    <div className="page-shell">
      {/* Top Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Users className="primary-color" size={28} />
            Staff & Team Management
          </h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Manage employee directory, roles, counter POS access PINs, shifts, and active attendance status.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} />
          <span>+ Add Staff Member</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="stat-grid" style={{ marginTop: 16 }}>
        <StatCard
          icon={Users}
          label="Total Staff Team"
          value={stats.total}
          tone="blue"
          sub="Registered accounts"
        />
        <StatCard
          icon={UserCheck}
          label="Active On-Duty"
          value={stats.activeCount}
          tone="green"
          sub={`${stats.total > 0 ? Math.round((stats.activeCount / stats.total) * 100) : 0}% available`}
        />
        <StatCard
          icon={ShoppingCart}
          label="Active Cashiers"
          value={stats.cashierCount}
          tone="purple"
          sub="Billing counter staff"
        />
        <StatCard
          icon={Shield}
          label="Managers & Admin"
          value={stats.managersCount}
          tone="orange"
          sub="Supervisors on record"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="table-card" style={{ marginTop: 20 }}>
        <div
          className="table-header-filters"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            padding: 16,
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Omni Search */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 420 }}>
            <Search
              size={18}
              className="muted"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 38, width: '100%' }}
              placeholder="Search staff name, role, phone, or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="btn-icon"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setQuery('')}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <select
              className="form-input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ width: 'auto', minWidth: 140 }}
            >
              <option value="all">All Roles</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto', minWidth: 130 }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Content View */}
        {filteredStaff.length === 0 ? (
          <EmptyState
            icon={Users}
            title={query ? 'No matching staff members found' : 'No staff members added yet'}
            hint={
              query
                ? 'Try adjusting your search keywords or clear the filters.'
                : 'Click "+ Add Staff Member" to add your first cashier or employee.'
            }
            actionLabel={query ? 'Clear Search' : '+ Add Staff Member'}
            onAction={query ? () => setQuery('') : openAddModal}
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive desktop-only">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Role & Responsibilities</th>
                    <th>Contact Info</th>
                    <th>Assigned Shift</th>
                    <th>Joined</th>
                    <th>POS Access PIN</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((member) => {
                    const RoleIcon = getRoleIcon(member.role);
                    const isRevealed = revealedPins[member.id];
                    const cleanPhone = (member.phone || '').replace(/\D/g, '');

                    return (
                      <tr key={member.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: '50%',
                                background: member.status === 'Active' ? 'var(--primary-subtle, #e0e7ff)' : '#f1f5f9',
                                color: member.status === 'Active' ? 'var(--primary, #4338ca)' : '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 14,
                                flexShrink: 0,
                              }}
                            >
                              {(member.name || 'S')
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </div>
                            <div>
                              <strong style={{ fontSize: 14, display: 'block' }}>{member.name}</strong>
                              <span className="muted small">ID: {member.id}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={`badge ${getRoleBadgeClass(member.role)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <RoleIcon size={13} />
                            {member.role}
                          </span>
                        </td>

                        <td>
                          <div>
                            {member.phone ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Phone size={13} className="muted" />
                                <a href={`tel:${member.phone}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                  {member.phone}
                                </a>
                              </div>
                            ) : (
                              <span className="muted small">No phone</span>
                            )}
                            {member.email && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <Mail size={13} className="muted" />
                                <span className="muted small">{member.email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} />
                            {member.shift || 'Full Day'}
                          </span>
                        </td>

                        <td>
                          <span className="muted small">
                            {member.joinedDate ? formatDate(member.joinedDate) : '—'}
                          </span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <KeyRound size={13} className="muted" />
                            <code style={{ fontSize: 13, letterSpacing: 2 }}>
                              {isRevealed ? member.pin || '1234' : '••••'}
                            </code>
                            <button
                              type="button"
                              className="btn-icon"
                              title={isRevealed ? 'Hide PIN' : 'Show PIN'}
                              onClick={() => togglePinReveal(member.id)}
                              style={{ padding: 2 }}
                            >
                              {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>

                        <td>
                          <button
                            type="button"
                            className={`badge ${member.status === 'Active' ? 'badge-green' : 'badge-gray'}`}
                            onClick={() => handleToggleStatus(member)}
                            title="Click to toggle Active/Inactive"
                            style={{ cursor: 'pointer', border: 'none', padding: '4px 10px' }}
                          >
                            {member.status === 'Active' ? '● Active' : '○ Inactive'}
                          </button>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/91${cleanPhone.slice(-10)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-ghost btn-sm"
                                title="Chat on WhatsApp"
                                style={{ padding: '4px 8px' }}
                              >
                                WA
                              </a>
                            )}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              title="Edit profile"
                              onClick={() => openEditModal(member)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm text-danger"
                              title="Delete member"
                              onClick={() => setDeleteTarget(member)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-cards-view mobile-only" style={{ padding: 12 }}>
              {filteredStaff.map((member) => {
                const RoleIcon = getRoleIcon(member.role);
                const isRevealed = revealedPins[member.id];
                const cleanPhone = (member.phone || '').replace(/\D/g, '');

                return (
                  <div
                    key={member.id}
                    className="mobile-card"
                    style={{
                      padding: 14,
                      marginBottom: 10,
                      borderRadius: 10,
                      border: '1px solid var(--border-color, #e2e8f0)',
                      background: 'var(--surface-color, #fff)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: '50%',
                            background: member.status === 'Active' ? 'var(--primary-subtle, #e0e7ff)' : '#f1f5f9',
                            color: member.status === 'Active' ? 'var(--primary, #4338ca)' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 15,
                            flexShrink: 0,
                          }}
                        >
                          {(member.name || 'S')
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ fontSize: 16 }}>{member.name}</strong>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                            <span className={`badge ${getRoleBadgeClass(member.role)}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                              <RoleIcon size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                              {member.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status toggle button */}
                      <button
                        type="button"
                        className={`badge ${member.status === 'Active' ? 'badge-green' : 'badge-gray'}`}
                        onClick={() => handleToggleStatus(member)}
                        style={{ cursor: 'pointer', border: 'none', padding: '5px 10px', fontSize: 12 }}
                      >
                        {member.status === 'Active' ? '● Active' : '○ Inactive'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: 13 }}>
                      <div>
                        <span className="muted" style={{ fontSize: 11, display: 'block' }}>Assigned Shift</span>
                        <span style={{ fontWeight: 500 }}>{member.shift || 'Full Day'}</span>
                      </div>
                      <div>
                        <span className="muted" style={{ fontSize: 11, display: 'block' }}>POS PIN</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <code style={{ fontSize: 13, letterSpacing: 2 }}>
                            {isRevealed ? member.pin || '1234' : '••••'}
                          </code>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => togglePinReveal(member.id)}
                            style={{ padding: 2 }}
                          >
                            {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {member.phone && (
                      <div style={{ marginTop: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={13} className="muted" />
                        <a href={`tel:${member.phone}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }}>
                          {member.phone}
                        </a>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: '1px solid var(--border-color, #f1f5f9)',
                      }}
                    >
                      <span className="muted small">Joined: {member.joinedDate ? formatDate(member.joinedDate) : '—'}</span>

                      <div style={{ display: 'flex', gap: 8 }}>
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/91${cleanPhone.slice(-10)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '6px 12px' }}
                          >
                            WhatsApp
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEditModal(member)}
                          style={{ padding: '6px 12px' }}
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-danger"
                          onClick={() => setDeleteTarget(member)}
                          style={{ padding: '6px 10px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      {formOpen && (
        <div className="modal-backdrop" onClick={() => setFormOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users className="primary-color" size={20} />
                {editingStaff ? 'Edit Staff Profile' : 'Add New Staff Member'}
              </h3>
              <button type="button" className="btn-icon" onClick={() => setFormOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  marginBottom: 16,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStaff}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      Role
                    </label>
                    <select
                      className="form-input"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      Shift
                    </label>
                    <select
                      className="form-input"
                      value={formData.shift}
                      onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    >
                      {SHIFT_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      Mobile Phone
                    </label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="10-digit number (e.g. 9876543210)"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      POS Access PIN (4 digits)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      className="form-input"
                      placeholder="e.g. 1234"
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. ramesh@store.in (optional)"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Status
                  </label>
                  <select
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active (Eligible for billing counter)</option>
                    <option value="Inactive">Inactive (Counter access suspended)</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStaff ? 'Update Member' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Staff Member?"
        message={`Are you sure you want to remove "${deleteTarget?.name}" from your staff records? This action cannot be undone.`}
        confirmLabel="Delete Staff"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteStaff}
      />
    </div>
  );
}
