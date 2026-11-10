import { useEffect, useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  Star,
  Package,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Eye,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Calendar,
  HeartHandshake,
  ExternalLink,
  X,
  Filter,
  Check,
  Clock
} from 'lucide-react';
import { api } from '../api';
import ConfirmDialog from './ConfirmDialog';

export default function AdminControlPanel({ language = 'en', onNotice, onUsersChange, users = [], tasks: propTasks = [] }) {
  const isBn = language === 'bn';

  const t = isBn ? {
    panelTitle: 'অ্যাডমিন নিয়ন্ত্রণ প্যানেল',
    panelSubtitle: 'ব্যবহারকারী, রানার ভেরিফিকেশন, টাস্ক ও প্ল্যাটফর্ম পরিচালনা করুন',
    tabs: {
      overview: 'ওভারভিউ',
      users: 'ব্যবহারকারী',
      approvals: 'রানার অনুমোদন',
      tasks: 'টাস্ক পরিচালনা',
      reviews: 'রিভিউ',
      chats: 'কথোপকথন',
      reports: 'রিপোর্ট',
      audit: 'অডিট লগ',
    },
    kpi: {
      totalUsers: 'মোট ব্যবহারকারী',
      pendingApprovals: 'অপেক্ষমাণ রানার',
      activeTasks: 'চলমান টাস্ক',
      openReports: 'খোলা রিপোর্ট',
      totalReviews: 'মোট রিভিউ',
    },
    actions: {
      suspend: 'স্থগিত করুন',
      reactivate: 'সক্রিয় করুন',
      approve: 'অনুমোদন',
      reject: 'প্রত্যাখ্যান',
      delete: 'মুছুন',
      viewed: 'পর্যালোচিত চিহ্নিত করুন',
      open: 'পুনরায় খুলুন',
      inspect: 'ছবি ও তথ্য দেখুন',
      close: 'বন্ধ করুন',
      deleteTask: 'টাস্ক মুছুন',
    },
    filters: {
      all: 'সকল',
      customers: 'গ্রাহক',
      runners: 'রানার',
      pending: 'অনুমোদনের অপেক্ষায়',
      suspended: 'স্থগিত অ্যাকাউন্ট',
      searchPlaceholder: 'নাম, ইমেইল, মোবাইল বা এলাকা দিয়ে খুঁজুন...',
      searchTasks: 'টাস্কের শিরোনাম বা ঠিকানা দিয়ে খুঁজুন...',
    },
    confirmTitle: 'নিশ্চিত করুন',
    empty: 'কোনো তথ্য নেই',
    allApproved: 'সব রানারের ভেরিফিকেশন সম্পন্ন!',
  } : {
    panelTitle: 'Admin Command Center',
    panelSubtitle: 'Moderate users, approve runners, oversee tasks & ensure platform trust',
    tabs: {
      overview: 'Overview',
      users: 'Users',
      approvals: 'Runner Approvals',
      tasks: 'Tasks Moderation',
      reviews: 'Reviews',
      chats: 'Conversations',
      reports: 'Reports',
      audit: 'Audit Log',
    },
    kpi: {
      totalUsers: 'Total Users',
      pendingApprovals: 'Pending Runners',
      activeTasks: 'Active Tasks',
      openReports: 'Open Reports',
      totalReviews: 'User Reviews',
    },
    actions: {
      suspend: 'Suspend',
      reactivate: 'Reactivate',
      approve: 'Approve',
      reject: 'Reject',
      delete: 'Delete',
      viewed: 'Mark Reviewed',
      open: 'Reopen',
      inspect: 'View Profile',
      close: 'Close',
      deleteTask: 'Delete Task',
    },
    filters: {
      all: 'All',
      customers: 'Customers',
      runners: 'Runners',
      pending: 'Pending Approval',
      suspended: 'Suspended',
      searchPlaceholder: 'Search by name, email, phone or area...',
      searchTasks: 'Search tasks by title, address...',
    },
    confirmTitle: 'Please Confirm Action',
    empty: 'No records found',
    allApproved: 'All runner verifications are up to date!',
  };

  const [tab, setTab] = useState('users');
  const [reviews, setReviews] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [openConversation, setOpenConversation] = useState(null);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [taskList, setTaskList] = useState(propTasks);
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filter & Search states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');

  // Inspection modal
  const [inspectedUser, setInspectedUser] = useState(null);

  // Sync prop tasks
  useEffect(() => {
    if (propTasks && propTasks.length > 0) {
      setTaskList(propTasks);
    }
  }, [propTasks]);

  // Load Tab Data
  async function loadTab(next = tab) {
    setLoading(true);
    try {
      if (next === 'reviews') setReviews((await api.adminReviews()).reviews || []);
      if (next === 'chats') setConversations((await api.adminConversations()).conversations || []);
      if (next === 'reports') setReports((await api.adminReports()).reports || []);
      if (next === 'audit') setLogs((await api.adminAudit()).logs || []);
      if (next === 'tasks' && (!propTasks || propTasks.length === 0)) {
        const res = await api.tasks();
        setTaskList(res.tasks || []);
      }
    } catch (error) {
      onNotice?.(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTab(tab);
  }, [tab]);

  // Confirmation Helper
  function ask(message, action) {
    setConfirm({ message, action });
  }

  async function runConfirmed() {
    const action = confirm?.action;
    setConfirm(null);
    if (!action) return;
    try {
      await action();
      await loadTab(tab);
      if (onUsersChange) await onUsersChange();
    } catch (error) {
      onNotice?.(error.message);
    }
  }

  // KPI Calculations
  const totalUserCount = users.length;
  const customersCount = users.filter((u) => u.role === 'customer').length;
  const runnersCount = users.filter((u) => u.role === 'runner').length;
  const pendingRunners = users.filter((u) => u.role === 'runner' && u.verificationStatus === 'pending');
  const suspendedCount = users.filter((u) => u.isActive === false).length;

  const openReportsCount = reports.filter((r) => r.status === 'open').length;
  const activeTasksCount = taskList.filter((t) => ['accepted', 'picked-up', 'in-transit', 'arriving'].includes(t.status)).length;

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Role filter
      if (userRoleFilter === 'customer' && user.role !== 'customer') return false;
      if (userRoleFilter === 'runner' && user.role !== 'runner') return false;
      if (userRoleFilter === 'pending' && (user.role !== 'runner' || user.verificationStatus !== 'pending')) return false;
      if (userRoleFilter === 'suspended' && user.isActive !== false) return false;

      // Text search
      if (!userSearch.trim()) return true;
      const term = userSearch.toLowerCase();
      return (
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.phone?.includes(term) ||
        user.area?.toLowerCase().includes(term)
      );
    });
  }, [users, userRoleFilter, userSearch]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return taskList.filter((task) => {
      if (taskStatusFilter !== 'all' && task.status !== taskStatusFilter) return false;
      if (!taskSearch.trim()) return true;
      const term = taskSearch.toLowerCase();
      return (
        task.title?.toLowerCase().includes(term) ||
        task.pickupAddress?.toLowerCase().includes(term) ||
        task.deliveryAddress?.toLowerCase().includes(term) ||
        task.customerId?.name?.toLowerCase().includes(term) ||
        task.runnerId?.name?.toLowerCase().includes(term)
      );
    });
  }, [taskList, taskStatusFilter, taskSearch]);

  return (
    <section className="admin-command-center">
      {/* HEADER BAR */}
      <div className="admin-header-row">
        <div>
          <span className="admin-badge-eyebrow">
            <ShieldCheck size={14} className="text-emerald-600 inline mr-1" />
            SUPER ADMIN
          </span>
          <h2>{t.panelTitle}</h2>
          <p>{t.panelSubtitle}</p>
        </div>
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={() => {
            loadTab(tab);
            onUsersChange?.();
          }}
          disabled={loading}
          title="Refresh All"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card" onClick={() => { setTab('users'); setUserRoleFilter('all'); }}>
          <div className="kpi-icon-wrap bg-amber-50 text-amber-800">
            <Users size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">{t.kpi.totalUsers}</span>
            <b className="kpi-number">{totalUserCount}</b>
            <small className="kpi-sub">{customersCount} Customers · {runnersCount} Runners</small>
          </div>
        </div>

        <div
          className={`admin-kpi-card ${pendingRunners.length > 0 ? 'highlight-amber' : ''}`}
          onClick={() => setTab('approvals')}
        >
          <div className="kpi-icon-wrap bg-amber-100 text-amber-900">
            <UserCheck size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">{t.kpi.pendingApprovals}</span>
            <b className="kpi-number text-amber-800">{pendingRunners.length}</b>
            <small className="kpi-sub">
              {pendingRunners.length > 0 ? 'Needs verification review' : 'All up to date'}
            </small>
          </div>
        </div>

        <div className="admin-kpi-card" onClick={() => setTab('tasks')}>
          <div className="kpi-icon-wrap bg-blue-50 text-blue-800">
            <Package size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">{t.kpi.activeTasks}</span>
            <b className="kpi-number">{activeTasksCount}</b>
            <small className="kpi-sub">{taskList.length} Total tasks recorded</small>
          </div>
        </div>

        <div
          className={`admin-kpi-card ${openReportsCount > 0 ? 'highlight-red' : ''}`}
          onClick={() => setTab('reports')}
        >
          <div className="kpi-icon-wrap bg-rose-50 text-rose-800">
            <ShieldAlert size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">{t.kpi.openReports}</span>
            <b className="kpi-number text-rose-700">{openReportsCount}</b>
            <small className="kpi-sub">{reports.length} Reports logged</small>
          </div>
        </div>
      </div>

      {/* MODERN TAB NAVIGATION */}
      <div className="admin-tabs-bar">
        <button
          type="button"
          className={`admin-tab-item ${tab === 'users' ? 'active' : ''}`}
          onClick={() => setTab('users')}
        >
          <Users size={16} />
          <span>{t.tabs.users}</span>
          <span className="tab-count-pill">{totalUserCount}</span>
        </button>

        <button
          type="button"
          className={`admin-tab-item ${tab === 'approvals' ? 'active' : ''} ${pendingRunners.length > 0 ? 'tab-urgent' : ''}`}
          onClick={() => setTab('approvals')}
        >
          <UserCheck size={16} />
          <span>{t.tabs.approvals}</span>
          {pendingRunners.length > 0 && (
            <span className="tab-urgent-pill">{pendingRunners.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`admin-tab-item ${tab === 'tasks' ? 'active' : ''}`}
          onClick={() => setTab('tasks')}
        >
          <Package size={16} />
          <span>{t.tabs.tasks}</span>
          <span className="tab-count-pill">{taskList.length}</span>
        </button>

        <button
          type="button"
          className={`admin-tab-item ${tab === 'reviews' ? 'active' : ''}`}
          onClick={() => setTab('reviews')}
        >
          <Star size={16} />
          <span>{t.tabs.reviews}</span>
          <span className="tab-count-pill">{reviews.length}</span>
        </button>

        <button
          type="button"
          className={`admin-tab-item ${tab === 'chats' ? 'active' : ''}`}
          onClick={() => setTab('chats')}
        >
          <MessageSquare size={16} />
          <span>{t.tabs.chats}</span>
          <span className="tab-count-pill">{conversations.length}</span>
        </button>

        <button
          type="button"
          className={`admin-tab-item ${tab === 'reports' ? 'active' : ''}`}
          onClick={() => setTab('reports')}
        >
          <ShieldAlert size={16} />
          <span>{t.tabs.reports}</span>
          {openReportsCount > 0 && <span className="tab-alert-dot" />}
        </button>

        <button
          type="button"
          className={`admin-tab-item ${tab === 'audit' ? 'active' : ''}`}
          onClick={() => setTab('audit')}
        >
          <FileText size={16} />
          <span>{t.tabs.audit}</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: USERS LIST & SEARCH
          ========================================================================= */}
      {tab === 'users' && (
        <div className="admin-content-pane">
          {/* Controls Bar */}
          <div className="admin-filter-bar">
            <div className="admin-search-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder={t.filters.searchPlaceholder}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              {userSearch && (
                <button type="button" onClick={() => setUserSearch('')} className="search-clear">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="admin-filter-pills">
              <button
                type="button"
                className={`filter-pill ${userRoleFilter === 'all' ? 'active' : ''}`}
                onClick={() => setUserRoleFilter('all')}
              >
                {t.filters.all} ({totalUserCount})
              </button>
              <button
                type="button"
                className={`filter-pill ${userRoleFilter === 'runner' ? 'active' : ''}`}
                onClick={() => setUserRoleFilter('runner')}
              >
                {t.filters.runners} ({runnersCount})
              </button>
              <button
                type="button"
                className={`filter-pill ${userRoleFilter === 'customer' ? 'active' : ''}`}
                onClick={() => setUserRoleFilter('customer')}
              >
                {t.filters.customers} ({customersCount})
              </button>
              <button
                type="button"
                className={`filter-pill ${userRoleFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setUserRoleFilter('pending')}
              >
                {t.filters.pending} ({pendingRunners.length})
              </button>
              <button
                type="button"
                className={`filter-pill ${userRoleFilter === 'suspended' ? 'active' : ''}`}
                onClick={() => setUserRoleFilter('suspended')}
              >
                {t.filters.suspended} ({suspendedCount})
              </button>
            </div>
          </div>

          {/* User Cards List */}
          <div className="admin-user-cards-grid">
            {filteredUsers.length === 0 ? (
              <div className="admin-empty-state">
                <Users size={36} className="text-stone-300 mb-2" />
                <p>{t.empty}</p>
              </div>
            ) : (
              filteredUsers.map((member) => (
                <article className={`admin-user-card ${!member.isActive ? 'is-suspended' : ''}`} key={member._id}>
                  <div className="user-card-top">
                    {/* Avatar with click-to-inspect */}
                    <div
                      className="user-avatar-wrap"
                      onClick={() => setInspectedUser(member)}
                      title={t.actions.inspect}
                    >
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="user-avatar-img" />
                      ) : (
                        <div className="user-avatar-fallback">
                          {member.name?.slice(0, 1).toUpperCase() || 'U'}
                        </div>
                      )}
                      <span className="avatar-inspect-hint"><Eye size={12} /></span>
                    </div>

                    {/* Basic Info */}
                    <div className="user-card-identity">
                      <div className="user-name-row">
                        <b>{member.name}</b>
                        <span className={`role-tag role-${member.role}`}>{member.role}</span>
                      </div>
                      <span className="user-contact-text"><Mail size={12} /> {member.email}</span>
                      <span className="user-contact-text"><Phone size={12} /> {member.phone}</span>
                    </div>

                    {/* Status Badges */}
                    <div className="user-status-col">
                      <span className={`status-badge status-${member.isActive ? 'active' : 'suspended'}`}>
                        {member.isActive ? 'Active' : 'Suspended'}
                      </span>
                      {member.role === 'runner' && (
                        <span className={`verify-badge verify-${member.verificationStatus || 'approved'}`}>
                          {member.verificationStatus === 'pending' && <Clock size={11} />}
                          {member.verificationStatus === 'approved' && <CheckCircle2 size={11} />}
                          {member.verificationStatus === 'rejected' && <XCircle size={11} />}
                          <span>{member.verificationStatus || 'approved'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Secondary Details: Area, Age, Rating */}
                  <div className="user-card-meta">
                    {member.area && (
                      <span className="meta-pill"><MapPin size={11} /> {member.area}</span>
                    )}
                    {member.age && (
                      <span className="meta-pill"><Calendar size={11} /> {member.age} yrs</span>
                    )}
                    {member.role === 'runner' && (
                      <span className="meta-pill text-amber-700">★ {member.avgRating ?? '5.0'} ({member.reviewCount || 0})</span>
                    )}
                  </div>

                  {/* Actions */}
                  {member.role !== 'admin' && (
                    <div className="user-card-actions">
                      {member.role === 'runner' && member.verificationStatus !== 'approved' && (
                        <button
                          type="button"
                          className="btn-action btn-approve"
                          onClick={() => ask(`${t.actions.approve} runner ${member.name}?`, () => api.setRunnerVerification(member._id, 'approved'))}
                        >
                          <Check size={14} /> {t.actions.approve}
                        </button>
                      )}

                      {member.role === 'runner' && member.verificationStatus !== 'rejected' && (
                        <button
                          type="button"
                          className="btn-action btn-reject"
                          onClick={() => ask(`${t.actions.reject} runner ${member.name}?`, () => api.setRunnerVerification(member._id, 'rejected'))}
                        >
                          <X size={14} /> {t.actions.reject}
                        </button>
                      )}

                      <button
                        type="button"
                        className={`btn-action ${member.isActive ? 'btn-suspend' : 'btn-reactivate'}`}
                        onClick={() => ask(`${member.isActive ? t.actions.suspend : t.actions.reactivate} ${member.name}?`, () => api.setUserStatus(member._id, !member.isActive))}
                      >
                        {member.isActive ? t.actions.suspend : t.actions.reactivate}
                      </button>

                      <button
                        type="button"
                        className="btn-action btn-delete"
                        onClick={() => ask(`${t.actions.delete} user ${member.name}?`, () => api.adminDeleteUser(member._id))}
                        title={t.actions.delete}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: RUNNER APPROVALS QUEUE (DEDICATED IDENTITY VERIFICATION VIEW)
          ========================================================================= */}
      {tab === 'approvals' && (
        <div className="admin-content-pane">
          <div className="approvals-header">
            <h3>Runner Verification Queue</h3>
            <p>Review real person photos, age requirement, and current living area before granting access to deliver neighborhood tasks.</p>
          </div>

          {pendingRunners.length === 0 ? (
            <div className="admin-empty-state-green">
              <CheckCircle2 size={44} className="text-emerald-600 mb-2" />
              <h4>{t.allApproved}</h4>
              <p>There are no runners currently waiting for identity verification.</p>
            </div>
          ) : (
            <div className="runner-approval-cards">
              {pendingRunners.map((runner) => (
                <div className="approval-card" key={runner._id}>
                  <div className="approval-photo-section">
                    {runner.avatarUrl ? (
                      <img src={runner.avatarUrl} alt={runner.name} className="approval-avatar-large" />
                    ) : (
                      <div className="approval-avatar-placeholder">
                        <Users size={36} />
                      </div>
                    )}
                    <span className="approval-photo-tag">Real Photo Required</span>
                  </div>

                  <div className="approval-info-section">
                    <div className="approval-name-header">
                      <h4>{runner.name}</h4>
                      <span className="verify-badge verify-pending">Pending Review</span>
                    </div>

                    <div className="approval-details-grid">
                      <div>
                        <span className="detail-label"><Mail size={12} /> Email</span>
                        <b>{runner.email}</b>
                      </div>
                      <div>
                        <span className="detail-label"><Phone size={12} /> Mobile Number</span>
                        <b>{runner.phone}</b>
                      </div>
                      <div>
                        <span className="detail-label"><MapPin size={12} /> Living Area</span>
                        <b>{runner.area || 'Not provided'}</b>
                      </div>
                      <div>
                        <span className="detail-label"><Calendar size={12} /> Age (18+)</span>
                        <b>{runner.age ? `${runner.age} years old` : 'Unknown'}</b>
                      </div>
                      {runner.emergencyContact && (
                        <div>
                          <span className="detail-label"><HeartHandshake size={12} /> Emergency Contact</span>
                          <b>{runner.emergencyContact}</b>
                        </div>
                      )}
                    </div>

                    <div className="approval-actions-bar">
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => ask(`${t.actions.approve} runner ${runner.name}?`, () => api.setRunnerVerification(runner._id, 'approved'))}
                      >
                        <Check size={16} /> {t.actions.approve} Runner
                      </button>
                      <button
                        type="button"
                        className="button button-outline text-danger"
                        onClick={() => ask(`${t.actions.reject} runner ${runner.name}?`, () => api.setRunnerVerification(runner._id, 'rejected'))}
                      >
                        <X size={16} /> {t.actions.reject}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: TASKS MODERATION
          ========================================================================= */}
      {tab === 'tasks' && (
        <div className="admin-content-pane">
          <div className="admin-filter-bar">
            <div className="admin-search-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder={t.filters.searchTasks}
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
              />
            </div>
            <div className="admin-filter-pills">
              {['all', 'pending', 'accepted', 'in-transit', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`filter-pill ${taskStatusFilter === status ? 'active' : ''}`}
                  onClick={() => setTaskStatusFilter(status)}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-tasks-grid">
            {filteredTasks.length === 0 ? (
              <div className="admin-empty-state">
                <Package size={36} className="text-stone-300 mb-2" />
                <p>{t.empty}</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <article className="admin-task-card" key={task._id}>
                  <div className="admin-task-top">
                    <div>
                      <span className="task-date-text">{new Date(task.createdAt).toLocaleDateString()}</span>
                      <h4 className="task-title-text">{task.title}</h4>
                    </div>
                    <span className={`task-status-pill status-${task.status}`}>{task.status}</span>
                  </div>

                  <p className="task-desc-excerpt">{task.description}</p>

                  <div className="task-route-box">
                    <div className="route-stop">
                      <span className="stop-dot pickup" />
                      <div>
                        <small>Pickup</small>
                        <b>{task.pickupAddress || 'Pickup address'}</b>
                      </div>
                    </div>
                    <div className="route-stop">
                      <span className="stop-dot delivery" />
                      <div>
                        <small>Delivery</small>
                        <b>{task.deliveryAddress || 'Delivery address'}</b>
                      </div>
                    </div>
                  </div>

                  <div className="task-card-footer">
                    <span className="task-price-tag">৳ {Number(task.estimatedPrice || 0).toLocaleString()}</span>
                    <button
                      type="button"
                      className="btn-danger-quiet"
                      onClick={() => ask(`${t.actions.deleteTask} "${task.title}"?`, () => api.adminDeleteTask(task._id))}
                    >
                      <Trash2 size={14} /> {t.actions.deleteTask}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: REVIEWS
          ========================================================================= */}
      {tab === 'reviews' && (
        <div className="admin-content-pane">
          <div className="admin-reviews-list">
            {reviews.length === 0 ? (
              <div className="admin-empty-state">
                <Star size={36} className="text-stone-300 mb-2" />
                <p>{t.empty}</p>
              </div>
            ) : (
              reviews.map((review) => (
                <article className="admin-review-card" key={review._id}>
                  <div className="review-top-row">
                    <div>
                      <b>{review.reviewer?.name} → {review.reviewee?.name}</b>
                      <div className="star-rating-row">
                        {'★'.repeat(review.rating || 5)}{'☆'.repeat(5 - (review.rating || 5))}
                        <span>({review.rating} / 5)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-danger-quiet"
                      onClick={() => ask(`${t.actions.delete} review?`, () => api.adminDeleteReview(review._id))}
                    >
                      <Trash2 size={14} /> {t.actions.delete}
                    </button>
                  </div>
                  {review.task?.title && <small className="review-task-title">Task: {review.task.title}</small>}
                  {review.comment && <p className="review-comment-body">"{review.comment}"</p>}
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: CONVERSATIONS & CHATS
          ========================================================================= */}
      {tab === 'chats' && (
        <div className="admin-content-pane">
          <div className="admin-chat-split-view">
            <div className="admin-conversations-pane">
              {conversations.length === 0 ? (
                <div className="admin-empty-state"><p>{t.empty}</p></div>
              ) : (
                conversations.map((item) => (
                  <div
                    key={item._id}
                    className={`conv-list-item ${openConversation === item._id ? 'selected' : ''}`}
                    onClick={async () => {
                      setOpenConversation(item._id);
                      try {
                        setMessages((await api.adminConversationMessages(item._id)).messages || []);
                      } catch (err) {
                        onNotice?.(err.message);
                      }
                    }}
                  >
                    <div>
                      <b>{item.job?.title || 'Job Thread'}</b>
                      <span>{(item.participants || []).map((p) => p.name).join(' · ')}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-danger-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        ask(`${t.actions.delete} conversation?`, () => api.adminDeleteConversation(item._id));
                      }}
                      title="Delete Conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="admin-messages-pane">
              {openConversation ? (
                <div className="messages-stream">
                  <div className="messages-stream-header">
                    <strong>Message History</strong>
                  </div>
                  {messages.length === 0 ? (
                    <p className="no-msgs-note">No messages recorded in this conversation.</p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg._id} className="stream-msg-bubble">
                        <div className="stream-msg-meta">
                          <b>{msg.sender?.name || 'System'}</b>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt="Attached" className="stream-msg-image" />
                        )}
                        <p>{msg.text}</p>
                        <button
                          type="button"
                          className="msg-del-link"
                          onClick={() => ask(`${t.actions.delete} message?`, () => api.adminDeleteMessage(msg._id))}
                        >
                          <Trash2 size={11} /> delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="messages-placeholder">
                  <MessageSquare size={32} className="text-stone-300 mb-2" />
                  <p>Select a conversation from the left to inspect and moderate messages.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: REPORTS & SAFETY
          ========================================================================= */}
      {tab === 'reports' && (
        <div className="admin-content-pane">
          <div className="admin-reports-grid">
            {reports.length === 0 ? (
              <div className="admin-empty-state">
                <ShieldCheck size={36} className="text-stone-300 mb-2" />
                <p>No safety reports submitted.</p>
              </div>
            ) : (
              reports.map((report) => (
                <article className={`admin-report-card status-${report.status}`} key={report._id}>
                  <div className="report-card-top">
                    <div>
                      <span className={`report-status-badge ${report.status === 'open' ? 'status-open' : 'status-reviewed'}`}>
                        {report.status}
                      </span>
                      <h4>Reported by {report.reporter?.name || 'User'}</h4>
                    </div>
                    <button
                      type="button"
                      className="btn-danger-icon"
                      onClick={() => ask(`${t.actions.delete} report?`, () => api.adminDeleteReport(report._id))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="report-reason-text">"{report.reason}"</p>
                  <div className="report-card-actions">
                    <button
                      type="button"
                      className="button button-outline button-small"
                      onClick={() => ask(
                        report.status === 'open' ? t.actions.viewed : t.actions.open,
                        () => api.adminUpdateReport(report._id, report.status === 'open' ? 'reviewed' : 'open')
                      )}
                    >
                      {report.status === 'open' ? t.actions.viewed : t.actions.open}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: AUDIT LOGS
          ========================================================================= */}
      {tab === 'audit' && (
        <div className="admin-content-pane">
          <div className="admin-audit-stream">
            {logs.length === 0 ? (
              <div className="admin-empty-state"><p>{t.empty}</p></div>
            ) : (
              logs.map((log) => (
                <div className="audit-row" key={log._id}>
                  <span className="audit-icon-marker" />
                  <div className="audit-content">
                    <div className="audit-title-row">
                      <b>{log.actor?.name || 'Admin'}</b>
                      <span className="audit-action-tag">{log.action}</span>
                      <span className="audit-time">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <span className="audit-target-text">Target: {log.targetType} ({log.targetId})</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* USER PHOTO & PROFILE INSPECTION MODAL */}
      {inspectedUser && (
        <div className="admin-modal-overlay" onClick={() => setInspectedUser(null)}>
          <div className="admin-inspect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inspect-modal-header">
              <h3>User Verification Details</h3>
              <button type="button" onClick={() => setInspectedUser(null)} className="text-button">
                <X size={18} />
              </button>
            </div>

            <div className="inspect-modal-body">
              <div className="inspect-photo-center">
                {inspectedUser.avatarUrl ? (
                  <img src={inspectedUser.avatarUrl} alt={inspectedUser.name} className="inspect-large-avatar" />
                ) : (
                  <div className="inspect-large-avatar placeholder">
                    <Users size={48} />
                  </div>
                )}
                <span className="inspect-role-tag">{inspectedUser.role}</span>
              </div>

              <div className="inspect-info-table">
                <div className="table-row">
                  <span>Full Name</span>
                  <b>{inspectedUser.name}</b>
                </div>
                <div className="table-row">
                  <span>Email Address</span>
                  <b>{inspectedUser.email}</b>
                </div>
                <div className="table-row">
                  <span>Mobile Number</span>
                  <b>{inspectedUser.phone}</b>
                </div>
                <div className="table-row">
                  <span>Current Living Area</span>
                  <b>{inspectedUser.area || 'Not provided'}</b>
                </div>
                <div className="table-row">
                  <span>Age</span>
                  <b>{inspectedUser.age ? `${inspectedUser.age} years old` : 'Not provided'}</b>
                </div>
                {inspectedUser.emergencyContact && (
                  <div className="table-row">
                    <span>Emergency Contact</span>
                    <b>{inspectedUser.emergencyContact}</b>
                  </div>
                )}
                <div className="table-row">
                  <span>Account Status</span>
                  <b>{inspectedUser.isActive ? 'Active' : 'Suspended'}</b>
                </div>
                {inspectedUser.role === 'runner' && (
                  <div className="table-row">
                    <span>Verification Status</span>
                    <b className="capitalize">{inspectedUser.verificationStatus || 'approved'}</b>
                  </div>
                )}
              </div>
            </div>

            <div className="inspect-modal-footer">
              <button
                type="button"
                className="button button-outline"
                onClick={() => setInspectedUser(null)}
              >
                {t.actions.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={t.confirmTitle}
        message={confirm?.message || ''}
        danger
        confirmLabel={isBn ? 'হ্যাঁ' : 'Yes'}
        cancelLabel={isBn ? 'না' : 'No'}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirmed}
      />
    </section>
  );
}
