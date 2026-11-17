import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
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
  XCircle,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Check,
  X,
  CheckCircle2,
  LayoutDashboard,
  Bike,
  BarChart2,
  Settings,
  Shield,
  Activity,
  ClipboardList,
  Menu,
  LogOut,
  Lock,
  Edit3,
  ChevronRight,
  AlertCircle,
  Info,
  Globe2,
  Bell,
  Home as HomeIcon,
} from 'lucide-react';
import { api } from '../api';
import ConfirmDialog from './ConfirmDialog';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';

const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];

export default function AdminControlPanel({ language = 'en', setLanguage, user, onNotice, onUsersChange, users = [], tasks: propTasks = [] }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const isBn = language === 'bn';
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditVisibleCount, setAuditVisibleCount] = useState(7);
const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]);
const taskIcon = L.divIcon({
  className: 'map-marker-wrap',
  html: '<span style="display:flex;align-items:center;justify-content:center;width:26px;height:34px"><svg width="18" height="18" viewBox="0 0 24 24" fill="#87482f" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg></span>',
  iconSize: [26, 34],
  iconAnchor: [13, 30],
});
  const [notifLoading, setNotifLoading] = useState(false);
  const dayNames = isBn ? DAY_NAMES_BN : DAY_NAMES_EN;

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  const visibleNotifications = showAllNotifications ? notifications : notifications.slice(0, 3);

  const fetchNotifications = async () => {
    if (!user) return;
    setNotifLoading(true);
    try {
      const response = await api.notifications();
      setNotifications(response.notifications || []);
    } catch (error) {
      // Ignore notification fetch failures
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = window.setInterval(fetchNotifications, 15000);
    return () => window.clearInterval(timer);
  }, [user]);

  const toggleAdminLanguage = () => {
    const next = language === 'en' ? 'bn' : 'en';
    setLanguage?.(next);
    localStorage.setItem('locomuv-language', next);
  };

  const t = isBn ? {
    panelTitle: 'অ্যাডমিন কন্ট্রোল প্যানেল',
    panelSubtitle: 'ব্যবহারকারী, রানার ভেরিফিকেশন, টাস্ক ও প্ল্যাটফর্ম পরিচালনা করুন',
    nav: {
      dashboard: 'ড্যাশবোর্ড',
      users: 'ব্যবহারকারী',
      runners: 'রানার',
      tasks: 'টাস্ক',
      reports: 'রিপোর্ট',
      conversations: 'কথোপকথন',
      settings: 'সেটিংস',
      audit: 'অডিট লগ',
    },
    kpi: {
      totalTasks: 'মোট টাস্ক',
      pending: 'অপেক্ষমাণ',
      activeJobs: 'সক্রিয় কাজ',
      completed: 'সম্পন্ন',
      waitingRunner: 'রানারের অপেক্ষায়',
      tasksInProgress: 'কাজ চলছে',
      tasksCompleted: 'কাজ সম্পন্ন',
    },
    actions: {
      suspend: 'স্থগিত করুন',
      reactivate: 'সক্রিয় করুন',
      approve: 'অনুমোদন',
      reject: 'প্রত্যাখ্যান',
      delete: 'মুছুন',
      deleteTask: 'টাস্ক মুছুন',
      edit: 'সম্পাদনা',
      close: 'বন্ধ',
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
    permissions: {
      users: 'ব্যবহারকারী',
      runner_approval: 'রানার অনুমোদন',
      tasks: 'টাস্ক',
      reports: 'রিপোর্ট',
    },
    panels: {
      taskOverview: 'টাস্ক ওভারভিউ',
      weeklyView: 'সাপ্তাহিক দৃশ্য',
      taskProgress: 'টাস্ক প্রগতি',
      localNetwork: 'স্থানীয় নেটওয়ার্ক',
      nearbyJobsMap: 'নীচের টাস্ক মানচিত্র',
      topPerformers: 'শীর্ষ রানার',
      recentTasks: 'সম্প্রতিক টাস্ক',
    },
    empty: 'কোনো তথ্য নেই',
    allApproved: 'সব রানারের ভেরিফিকেশন সম্পন্ন!',
    subAdminTitle: 'সাব-অ্যাডমিন অ্যাক্সেস',
    subAdminSubtitle: 'সাব-অ্যাডমিন আমন্ত্রণ ও অনুমতি পরিচালনা করুন',
    subAdminForm: 'নতুন সাব-অ্যাডমিন যোগ করুন',
    nameLabel: 'নাম',
    emailLabel: 'ইমেইল',
    passwordLabel: 'অস্থায়ী পাসওয়ার্ড',
    passwordPlaceholder: '১২+ অক্ষর',
    permissionsLabel: 'অনুমতি',
    addSubAdmin: 'সাব-অ্যাডমিন যোগ করুন',
    currentSubAdmins: 'বর্তমান সাব-অ্যাডমিন',
    permissionsCol: 'অনুমতি',
    statusCol: 'অবস্থা',
    editPermissions: 'অনুমতি সম্পাদনা',
    suspend: 'স্থগিত',
    remove: 'মুছুন',
    confirmRemove: 'এই সাব-অ্যাডমিনকে মুছতে চান?',
    runnersQueue: 'রানার যাচাইকরণ কিউ',
    runnersQueueDesc: 'অনুমতি দেওয়ার আগে বাস্তব ব্যক্তির ছবি ও বসবাসের এলাকা পর্যালোচনা করুন',
    realPhotoRequired: 'বাস্তব ছবি প্রয়োজন',
    userVerificationDetails: 'ব্যবহারকারী যাচাইের বিবরণ',
    messageHistory: 'বার্তার ইতিহাস',
    noMessages: 'কোনো বার্তা নেই',
    selectConversation: 'বার্তা দেখতে একটি কথোপকথন বেছে নিন',
    noSafetyReports: 'কোনো নিরাপত্তা রিপোর্ট জমা দেওয়া হয়নি',
    myAccountTitle: 'আমার অ্যাকাউন্ট',
    myAccountSubtitle: 'আপনার ব্যক্তিগত তথ্য ও নিরাপত্তা ব্যবস্থাপনা করুন',
    changeEmail: 'ইমেইল বা ফোন পরিবর্তন',
    changePassword: 'পাসওয়ার্ড পরিবর্তন',
    currentPassLabel: 'বর্তমান পাসওয়ার্ড',
    newPassLabel: 'নতুন পাসওয়ার্ড',
    toggleShow: 'দেখান',
    toggleHide: 'লুকান',
    passwordStrength: 'পাসওয়ার্ডের শক্তি',
    weak: 'দুর্বল',
    medium: 'মাঝারি',
    strong: 'শক্তি',
    eyeLabel: 'পাসওয়ার্ড দৃশ্যমানতা টগল',
    tasksInPeriod: 'এই সপ্তাহে কোনো টাস্ক নেই',
    noTasks: 'কোন টাস্ক নেই',
    openTasks: 'খোলা টাস্ক',
    viewAll: 'সব দেখা →',
    nearbyJobsMap: 'নীচের টাস্ক মানচিত্র',
    enableLocation: 'অবস্থান সেবা সক্ষম করুন যেন নিকটবর্তী টাস্ক দেখতে পারেন',
  } : {
    panelTitle: 'Admin Control Panel',
    panelSubtitle: 'Moderate users, approve runners, oversee tasks & ensure platform trust',
    nav: {
      dashboard: 'Dashboard',
      users: 'Users',
      runners: 'Runners',
      tasks: 'Tasks',
      reports: 'Reports',
      conversations: 'Conversations',
      settings: 'Settings',
      audit: 'Audit Log',
    },
    kpi: {
      totalTasks: 'Total Tasks',
      pending: 'Pending',
      activeJobs: 'Active Jobs',
      completed: 'Completed',
      waitingRunner: 'Waiting for runner',
      tasksInProgress: 'Tasks in progress',
      tasksCompleted: 'Tasks completed',
    },
    actions: {
      suspend: 'Suspend',
      reactivate: 'Reactivate',
      approve: 'Approve',
      reject: 'Reject',
      delete: 'Delete',
      deleteTask: 'Delete Task',
      edit: 'Edit',
      close: 'Close',
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
    panels: {
      taskOverview: 'Task Overview',
      weeklyView: 'Weekly View',
      taskProgress: 'Task Progress',
      localNetwork: 'Local Network',
      nearbyJobsMap: 'Nearby Jobs Map',
      topPerformers: 'Top Performers',
      recentTasks: 'Recent Tasks',
    },
    empty: 'No records found',
    allApproved: 'All runner verifications are up to date!',
    subAdminTitle: 'Sub-admin Access',
    subAdminSubtitle: 'Invite and manage sub-admins with scoped permissions.',
    subAdminForm: 'Add new sub-admin',
    nameLabel: 'Name',
    emailLabel: 'Email',
    passwordLabel: 'Temporary password',
    passwordPlaceholder: '12+ characters',
    permissionsLabel: 'Permissions',
    addSubAdmin: 'Add sub-admin',
    currentSubAdmins: 'Current sub-admins',
    permissionsCol: 'Permissions',
    statusCol: 'Status',
    editPermissions: 'Edit permissions',
    suspend: 'Suspend',
    remove: 'Remove',
    confirmRemove: 'Remove this sub-admin?',
    runnersQueue: 'Runner Verification Queue',
    runnersQueueDesc: 'Review real person photos and living area before granting access.',
    realPhotoRequired: 'Real Photo Required',
    userVerificationDetails: 'User Verification Details',
    messageHistory: 'Message History',
    noMessages: 'No messages recorded.',
    selectConversation: 'Select a conversation to inspect messages.',
    noSafetyReports: 'No safety reports submitted.',
    permissions: {
      users: 'Users',
      runner_approval: 'Runner approval',
      tasks: 'Tasks',
      reports: 'Reports',
    },
    myAccountTitle: 'My Account',
    myAccountSubtitle: 'Manage your personal information and security.',
    changeEmail: 'Change email or phone',
    changePassword: 'Change password',
    currentPassLabel: 'Current password',
    newPassLabel: 'New password',
    toggleShow: 'Show',
    toggleHide: 'Hide',
    passwordStrength: 'Password strength',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    eyeLabel: 'Toggle password visibility',
    tasksInPeriod: 'No tasks in this period',
    noTasks: 'No tasks',
    openTasks: 'Open tasks',
    viewAll: 'View All →',
    nearbyJobsMap: 'Nearby Jobs Map',
    enableLocation: 'Enable location services to view nearby jobs on the map.',
  };

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const [subAdmins, setSubAdmins] = useState([]);
  const [newSubAdmin, setNewSubAdmin] = useState({ name: '', email: '', password: '', permissions: ['users'] });
  const [showPassword, setShowPassword] = useState(false);
  const [inspectedUser, setInspectedUser] = useState(null);
  const [subAdminEdit, setSubAdminEdit] = useState(null);
  const [approveRunner, setApproveRunner] = useState(null);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');

  const [accountKind, setAccountKind] = useState('email');
  const [accountValue, setAccountValue] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [accountSent, setAccountSent] = useState(false);
  const [accountNotice, setAccountNotice] = useState('');
  const [accountError, setAccountError] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const isSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Keyboard-accessible stat card handlers
  const handleStatClick = (section, tab, status) => () => {
    setActiveSection(section);
    setTab(tab);
    setTaskStatusFilter(status);
  };
  const handleStatKeyDown = (section, tab, status) => (e) => {
    if (e.key === 'Enter') {
      setActiveSection(section);
      setTab(tab);
      setTaskStatusFilter(status);
    }
  };

  useEffect(() => {
    if (Array.isArray(propTasks)) {
      setTaskList(propTasks);
    }
  }, [propTasks]);

  async function loadTab(next = tab) {
    setLoading(true);
    try {
      if (next === 'reviews') setReviews((await api.adminReviews()).reviews || []);
      if (next === 'conversations') setConversations((await api.adminConversations()).conversations || []);
      if (next === 'reports') setReports((await api.adminReports()).reports || []);
      if (next === 'audit') setLogs((await api.adminAudit()).logs || []);
      if (next === 'tasks' && (!Array.isArray(propTasks) || propTasks.length === 0)) {
        const res = await api.tasks();
        setTaskList(res.tasks || []);
      }
    } catch (error) {
      if (!error.message.includes('permission')) onNotice?.(error.message);
      console.error(`Tab ${next} load failed:`, error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTab(tab);
  }, [tab]);

  useEffect(() => {
    if (isSuperAdmin) api.adminSubAdmins().then((data) => setSubAdmins(data.users || [])).catch(() => {});
  }, [user?.role, isSuperAdmin]);

  async function sendAccountCode(event) {
    event.preventDefault();
    setAccountBusy(true); setAccountError(''); setAccountNotice('');
    try {
      const result = await api.sendAccountChangeCode({ kind: accountKind, value: accountValue });
      setAccountSent(true);
      setAccountNotice(result.message || (isBn ? 'কোড পাঠানো হয়েছে।' : 'Verification code sent.'));
    } catch (err) { setAccountError(err.message); }
    finally { setAccountBusy(false); }
  }

  async function verifyAccountCode(event) {
    event.preventDefault();
    setAccountBusy(true); setAccountError('');
    try {
      const result = await api.verifyAccountChange({ kind: accountKind, value: accountValue, code: accountCode });
      setAccountNotice(result.message || (isBn ? 'আপডেট হয়েছে।' : 'Updated successfully.'));
      await logout();
      navigate('/login');
    } catch (err) { setAccountError(err.message); }
    finally { setAccountBusy(false); }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordBusy(true); setPasswordError(''); setPasswordNotice('');
    try {
      const result = await api.updatePassword({ currentPassword, newPassword });
      setPasswordNotice(result.message || (isBn ? 'পাসওয়ার্ড আপডেট হয়েছে।' : 'Password updated successfully.'));
      await logout();
      navigate('/login');
    } catch (err) { setPasswordError(err.message); }
    finally { setPasswordBusy(false); }
  }

  async function saveSubAdmin(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await api.adminCreateSubAdmin(newSubAdmin);
      setNewSubAdmin({ name: '', email: '', password: '', permissions: ['users'] });
      const data = await api.adminSubAdmins(); setSubAdmins(data.users || []);
      onNotice?.('Sub-admin created.');
    } catch (error) { onNotice?.(error.message); }
    finally { setLoading(false); }
  }

  async function removeSubAdmin(id) {
    if (!isSuperAdmin) return;
    try { await api.adminDeleteSubAdmin(id); setSubAdmins((items) => items.filter((item) => item._id !== id)); onNotice?.('Sub-admin removed.'); }
    catch (error) { onNotice?.(error.message); }
  }

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

  async function runApproveRunner() {
    const runner = approveRunner?.runner;
    const action = approveRunner?.action;
    setApproveRunner(null);
    if (!runner || !action) return;
    try {
      await api.setRunnerVerification(runner._id, action);
      await loadTab(tab);
      if (onUsersChange) await onUsersChange();
    } catch (error) {
      onNotice?.(error.message);
    }
  }

  const totalUserCount = users.length;
  const customersCount = users.filter((u) => u.role === 'customer').length;
  const runnersCount = users.filter((u) => u.role === 'runner').length;
  const pendingRunners = users.filter((u) => u.role === 'runner' && u.verificationStatus === 'pending');
  const suspendedCount = users.filter((u) => u.isActive === false).length;

  const openReportsCount = reports.filter((r) => r.status === 'open').length;
  const activeTasksCount = taskList.filter((t) => ['accepted', 'picked-up', 'in-transit', 'arriving'].includes(t.status)).length;
  const pendingTasksCount = taskList.filter((t) => t.status === 'pending').length;
  const completedTasksCount = taskList.filter((t) => t.status === 'completed').length;

  const weeklyActivity = useMemo(() => {
    const days = dayNames;
    const counts = days.map(() => 0);
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    taskList.forEach((t) => {
      const d = new Date(t.createdAt).getTime();
      if (d >= sevenDaysAgo) {
        const dayIdx = new Date(d).getDay();
        counts[dayIdx] += 1;
      }
    });
    return days.map((name, i) => ({ name, count: counts[i] }));
  }, [taskList, dayNames]);

  const filteredLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) => {
      const haystack = [
        log.actor?.name || '',
        log.action || '',
        log.targetType || '',
        String(log.targetId || ''),
        new Date(log.createdAt).toLocaleString(),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [logs, auditSearch]);
  const visibleLogs = filteredLogs.slice(0, auditVisibleCount);

  const filteredUsers = useMemo(() => {
    return users.filter((member) => {
      if (userRoleFilter === 'customer' && member.role !== 'customer') return false;
      if (userRoleFilter === 'runner' && member.role !== 'runner') return false;
      if (userRoleFilter === 'pending' && (member.role !== 'runner' || member.verificationStatus !== 'pending')) return false;
      if (userRoleFilter === 'suspended' && member.isActive !== false) return false;
      if (!userSearch.trim()) return true;
      const term = userSearch.toLowerCase();
      return (
        member.name?.toLowerCase().includes(term) ||
        member.email?.toLowerCase().includes(term) ||
        member.phone?.includes(term) ||
        member.area?.toLowerCase().includes(term)
      );
    });
  }, [users, userRoleFilter, userSearch]);

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

  const openTasks = taskList.filter((t) => ['pending', 'accepted', 'picked-up', 'in-transit', 'arriving'].includes(t.status));

  const navItems = [
    { key: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { key: 'users', label: t.nav.users, icon: Users },
    { key: 'runners', label: t.nav.runners, icon: Bike },
    { key: 'tasks', label: t.nav.tasks, icon: ClipboardList },
    { key: 'reports', label: t.nav.reports, icon: ShieldAlert },
    { key: 'conversations', label: t.nav.conversations, icon: MessageSquare },
    { key: 'settings', label: t.nav.settings, icon: Settings },
    { key: 'audit', label: t.nav.audit, icon: FileText },
  ];

  return (
    <section className="admin-dashboard">
      {/* SIDEBAR DRAWER */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Admin navigation">
        <div className="admin-brand">
          <div className="brand-mark"><ShieldCheck size={24} /></div>
          <div className="brand-name">
            <strong>LocoMuv</strong>
            <span>Admin</span>
          </div>
        </div>
        <div className="admin-sidebar-controls" />
        <nav className="admin-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.key;
            return (
                <button
                key={item.key}
                type="button"
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => { setActiveSection(item.key); if (item.key !== 'dashboard') { setTab(item.key); loadTab(item.key); } setSidebarOpen(false); }}
                aria-pressed={isActive}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-sidebar-logout"
            onClick={async () => {
              try {
                await logout();
                navigate('/');
              } catch (error) {
                window.alert(error.message);
              }
            }}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      {sidebarOpen && (
        <div className="admin-mobile-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* MAIN CONTENT */}
      <main className="admin-main" id="admin-main">
        {/* HEADER */}
        <header className="admin-header">
          <button
            type="button"
            className="btn-menu btn-menu-left"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Menu"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
          >
            <Menu size={18} />
          </button>
          <div className="admin-header-copy">
            <span className="header-eyebrow">{user?.role === 'sub_admin' ? 'SUB-ADMIN' : 'SUPER ADMIN'}</span>
            <h1>{t.panelTitle}</h1>
            <p>{t.panelSubtitle}</p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="language-switch"
              onClick={toggleAdminLanguage}
              aria-label="Toggle language"
              title={language === 'en' ? 'বাংলা' : 'English'}
            >
              <Globe2 size={15} />
              <span>{language === 'en' ? 'EN / বাংলা' : 'বাংলা / EN'}</span>
            </button>
            <div className="notification-wrap">
              <button
                type="button"
                className="notification-bell"
                onClick={() => setShowNotifications((current) => !current)}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              {showNotifications && <div className="notification-dropdown">
                <div className="notification-header">
                  <strong>Notifications</strong>
                  {unreadCount > 0 && <button type="button" className="text-button" onClick={async () => {
                    try {
                      await api.markAllNotificationsRead();
                      await fetchNotifications();
                    } catch (err) { window.alert(err.message); }
                  }}>Mark all read</button>}
                </div>
                {notifications.length === 0 ? <div className="notification-empty">No notifications yet.</div> : (
                  <>
                    {visibleNotifications.map((item) => (
                      <div key={item._id} className={`notification-item ${item.readAt ? '' : 'unread'}`}>
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.message}</p>
                        </div>
                        {!item.readAt && <button type="button" className="text-button" onClick={async () => {
                          try {
                            await api.markNotificationRead(item._id);
                            await fetchNotifications();
                          } catch (err) { window.alert(err.message); }
                        }}>Mark read</button>}
                      </div>
                    ))}
                    {notifications.length > 3 && (
                      <button type="button" className="notification-see-all" onClick={() => setShowAllNotifications((current) => !current)}>
                        {showAllNotifications ? 'Show recent 3' : 'See all'}
                      </button>
                    )}
                  </>
                )}
              </div>}
            </div>
            <Link to="/" className="admin-header-home" title={isBn ? 'হোম পেজে যান' : 'Go to home page'} aria-label={isBn ? 'হোম পেজে যান' : 'Go to home page'}>
              <HomeIcon size={16} />
              <span>{isBn ? 'হোম' : 'Home'}</span>
            </Link>
            <button
              type="button"
              className="btn-refresh"
              onClick={() => { loadTab(tab); onUsersChange?.(); }}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              className="btn-menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Menu"
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
            >
              <Menu size={18} />
              <span>{isBn ? 'মেনু' : 'Menu'}</span>
            </button>
          </div>
        </header>

        {/* STAT CARDS */}
        <section className="admin-kpi-row">
          <div className="stat-card stat-clickable" onClick={handleStatClick('dashboard', 'tasks', 'all')}
               role="button" tabIndex={0} aria-label={`Total tasks: ${taskList.length}`} onKeyDown={handleStatKeyDown('dashboard', 'tasks', 'all')}>
            <div className="stat-icon stat-total"><Package size={22} /></div>
            <div className="stat-info">
              <span className="stat-label">{t.kpi.totalTasks}</span>
              <b className="stat-number">{taskList.length}</b>
              <small className="stat-trend">{taskList.length > 0 ? 'All tasks recorded' : 'No tasks yet'}</small>
            </div>
          </div>
          <div className="stat-card stat-clickable" onClick={handleStatClick('dashboard', 'approvals', 'all')}
               role="button" tabIndex={0} aria-label={`Pending tasks: ${pendingTasksCount}`} onKeyDown={handleStatKeyDown('dashboard', 'approvals', 'all')}>
            <div className="stat-icon stat-pending"><Clock size={22} /></div>
            <div className="stat-info">
              <span className="stat-label">{t.kpi.pending}</span>
              <b className="stat-number">{pendingTasksCount}</b>
              <small className="stat-trend">{pendingTasksCount > 0 ? t.kpi.waitingRunner : t.noTasks}</small>
            </div>
          </div>
          <div className="stat-card stat-clickable" onClick={handleStatClick('dashboard', 'tasks', 'accepted')}
               role="button" tabIndex={0} aria-label={`Active jobs: ${activeTasksCount}`} onKeyDown={handleStatKeyDown('dashboard', 'tasks', 'accepted')}>
            <div className="stat-icon stat-active"><Bike size={22} /></div>
            <div className="stat-info">
              <span className="stat-label">{t.kpi.activeJobs}</span>
              <b className="stat-number">{activeTasksCount}</b>
              <small className="stat-trend">{activeTasksCount > 0 ? t.kpi.tasksInProgress : t.noTasks}</small>
            </div>
          </div>
          <div className="stat-card stat-clickable" onClick={handleStatClick('dashboard', 'tasks', 'completed')}
               role="button" tabIndex={0} aria-label={`Completed tasks: ${completedTasksCount}`} onKeyDown={handleStatKeyDown('dashboard', 'tasks', 'completed')}>
            <div className="stat-icon stat-completed"><Check size={22} /></div>
            <div className="stat-info">
              <span className="stat-label">{t.kpi.completed}</span>
              <b className="stat-number">{completedTasksCount}</b>
              <small className="stat-trend">{completedTasksCount > 0 ? t.kpi.tasksCompleted : t.noTasks}</small>
            </div>
          </div>
        </section>

        {/* DASHBOARD VIEW - GRID PANELS */}
        {activeSection === 'dashboard' && (
          <div className="admin-grid">
            {/* Task Overview Chart */}
            <section className="admin-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">{t.panels.weeklyView}</span>
                  <h3>{t.panels.taskOverview}</h3>
                </div>
                <select className="panel-select" defaultValue="Last 7 Days" aria-label="Chart period">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>
              </div>
              <div className="chart-wrap">
                {weeklyActivity.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyActivity} margin={{ top: 20, right: 12, left: 22, bottom: 32 }}>
                      <CartesianGrid stroke="rgba(56,189,248,0.18)" vertical={false} strokeDasharray="3 5" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'rgba(191,219,254,0.75)', fontSize: 11, margin: 12 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'rgba(191,219,254,0.75)', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: 'rgba(0,27,43,0.92)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 12, color: '#E6F7FF' }}
                        labelStyle={{ color: '#BFE9FF' }}
                        cursor={{ fill: 'rgba(56,189,248,0.08)' }}
                      />
                      <Bar dataKey="count" fill="#22d3ee" radius={[8, 8, 0, 0]} maxBarSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="admin-empty-state-chart" role="status" aria-label="Chart empty state">
                    <BarChart2 size={32} className="text-muted mb-2" />
                    <p>{t.tasksInPeriod}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Top Performers */}
            <section className="admin-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">{t.panels.topPerformers}</span>
                  <h3>{t.panels.topPerformers}</h3>
                </div>
              </div>
              <div className="performers-list">
                {users
                  .filter((u) => u.role === 'runner')
                  .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
                  .slice(0, 3)
                  .map((p, i) => (
                    <div key={p._id} className="performer-item">
                      <div className="performer-rank">{i + 1}</div>
                      <div className="performer-info">
                        <div className="performer-avatar">{p.name?.slice(0, 1) || 'U'}</div>
                        <div className="performer-text">
                          <b>{p.name}</b>
                          <small>{t.nav.runners}</small>
                        </div>
                      </div>
                      <span className="performer-tasks">{p.reviewCount || 0} Reviews</span>
                    </div>
                  ))}
                {users.filter((u) => u.role === 'runner').length === 0 && (
                  <div className="admin-empty-state"><Users size={24} className="text-muted mb-2" /><p>{t.empty}</p></div>
                )}
              </div>
            </section>

            {/* Recent Tasks */}
            <section className="admin-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">{t.panels.recentTasks}</span>
                  <h3>Recent Activity</h3>
                </div>
                <button type="button" className="panel-link" aria-label="View all recent tasks" onClick={() => { setActiveSection('tasks'); setTab('tasks'); }}>{t.viewAll}</button>
              </div>
              <div className="recent-tasks-list">
                {filteredTasks.slice(0, 5).map((task) => (
                  <div key={task._id} className="recent-task-item">
                    <div className="recent-task-info">
                      <span className="recent-task-title">{task.title}</span>
                      <span className={`badge badge-status status-${task.status}`}>{task.status}</span>
                    </div>
                    <span className="recent-task-date">{new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
                {filteredTasks.length === 0 && <div className="admin-empty-state"><Package size={24} className="text-muted mb-2" /><p>{t.noTasks}</p></div>}
              </div>
            </section>

            {/* Nearby Jobs Map */}
            <section className="admin-panel map-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">{t.panels.localNetwork}</span>
                  <h3>{t.panels.nearbyJobsMap}</h3>
                </div>
              </div>
              <div className="map-container-wrap">
                <div className="map-count-badge">{openTasks.length} টাস্ক মানচিত্রে</div>
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  scrollWheelZoom={false}
                  key={mapCenter.join(',')}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />
                  <useMapEvents
                    onClick={(e) => setMapCenter(e.latlng.toArray())}
                  />
                  {openTasks.map((task) => {
                    const pos = task.pickupPosition || task.deliveryPosition;
                    if (!pos || !Array.isArray(pos) || pos.length < 2) return null;
                    return (
                      <Marker
                        key={task._id}
                        position={[pos[0], pos[1]]}
                        icon={taskIcon}
                      >
                        <Popup>
                          <b>{task.title}</b>
                          <br />
                          {task.pickupAddress || 'পিকআপ স্থান'}
                          <br />
                          {money(task.finalPrice ?? task.estimatedPrice)}
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            </section>
          </div>
        )}

        {/* USERS VIEW */}
        {activeSection === 'users' && (
          <div className="admin-content-pane">
            <div className="admin-filter-bar">
              <div className="admin-search-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder={t.filters.searchPlaceholder}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <div className="admin-filter-pills">
                <button type="button" className={`filter-pill ${userRoleFilter === 'all' ? 'active' : ''}`} onClick={() => setUserRoleFilter('all')}>
                  {t.filters.all} ({totalUserCount})
                </button>
                <button type="button" className={`filter-pill ${userRoleFilter === 'runner' ? 'active' : ''}`} onClick={() => setUserRoleFilter('runner')}>
                  {t.filters.runners} ({runnersCount})
                </button>
                <button type="button" className={`filter-pill ${userRoleFilter === 'customer' ? 'active' : ''}`} onClick={() => setUserRoleFilter('customer')}>
                  {t.filters.customers} ({customersCount})
                </button>
                <button type="button" className={`filter-pill ${userRoleFilter === 'pending' ? 'active' : ''}`} onClick={() => setUserRoleFilter('pending')}>
                  {t.filters.pending} ({pendingRunners.length})
                </button>
                <button type="button" className={`filter-pill ${userRoleFilter === 'suspended' ? 'active' : ''}`} onClick={() => setUserRoleFilter('suspended')}>
                  {t.filters.suspended} ({suspendedCount})
                </button>
              </div>
            </div>

            <div className="admin-user-cards-grid">
              {filteredUsers.length === 0 ? (
                <div className="admin-empty-state"><Users size={36} className="text-muted mb-2" /><p>{t.empty}</p></div>
              ) : (
                filteredUsers.map((member) => {
                  const isActive = Boolean(member.isActive);
                  return (
                    <article
                      className={`admin-user-card admin-user-card-pro ${!isActive ? 'is-suspended' : ''}`}
                      key={member._id}
                      onClick={() => setInspectedUser(member)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setInspectedUser(member); } }}
                      aria-label={`${isBn ? 'বিস্তারিত দেখুন' : 'View details'}: ${member.name || 'User'}`}
                    >
                      <div className="user-card-glow" aria-hidden="true" />
                      <div className="user-card-header">
                        <div className="user-avatar-wrap">
                          {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} className="user-avatar-img" /> : <div className="user-avatar-fallback">{member.name?.slice(0, 1).toUpperCase() || 'U'}</div>}
                          <span className={`avatar-status-dot ${isActive ? 'online' : 'offline'}`} title={isActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়/স্থগিত' : 'Inactive')} />
                        </div>
                        <div className="user-card-title-block">
                          <b className="user-name-text">{member.name || '—'}</b>
                          <span className="user-id-text">{member.email ? member.email.split('@')[0] : (member.phone || member._id || '—')}</span>
                          <div className="user-card-badges">
                            <span className={`role-tag role-${member.role}`}>{member.role || '—'}</span>
                            <span className={`status-badge status-${isActive ? 'active' : 'suspended'}`}>{isActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'স্থগিত' : 'Suspended')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="user-card-divider" />

                      <div className="user-info-rows">
                        <div className="user-info-row"><span className="user-info-label"><Mail size={12} /> {isBn ? 'ইমেইল' : 'Email'}</span><b className="user-info-value">{member.email || '—'}</b></div>
                        <div className="user-info-row"><span className="user-info-label"><Phone size={12} /> {isBn ? 'ফোন' : 'Phone'}</span><b className="user-info-value">{member.phone || '—'}</b></div>
                        {member.area && <div className="user-info-row"><span className="user-info-label"><MapPin size={12} /> {isBn ? 'এলাকা' : 'Area'}</span><b className="user-info-value">{member.area}</b></div>}
                        {member.age && <div className="user-info-row"><span className="user-info-label"><Calendar size={12} /> {isBn ? 'বয়স' : 'Age'}</span><b className="user-info-value">{member.age} {isBn ? 'বছর' : 'yrs'}</b></div>}
                        {member.role === 'runner' && (
                          <div className="user-info-row"><span className="user-info-label"><Star size={12} /> {isBn ? 'রেটিং' : 'Rating'}</span><b className="user-info-value">★ {member.avgRating ?? '5.0'} ({member.reviewCount || 0})</b></div>
                        )}
                        {member.role === 'runner' && (
                          <div className="user-info-row"><span className="user-info-label"><CheckCircle2 size={12} /> {isBn ? 'ভেরিফিকেশন' : 'Verification'}</span><b className="user-info-value">{member.verificationStatus || 'approved'}</b></div>
                        )}
                        {member.emergencyContact && <div className="user-info-row"><span className="user-info-label"><Info size={12} /> {isBn ? 'জরুরি যোগাযোগ' : 'Emergency'}</span><b className="user-info-value">{member.emergencyContact}</b></div>}
                      </div>

                      <div className="user-card-footer">
                        <button type="button" className="btn-view-details btn-view-details-primary" onClick={(e) => { e.stopPropagation(); setInspectedUser(member); }}>
                          <Eye size={14} /> {isBn ? 'বিস্তারিত দেখুন' : 'View Details'}
                        </button>
                        {!['admin', 'super_admin', 'sub_admin'].includes(member.role) && (
                          <div className="user-card-actions" onClick={(e) => e.stopPropagation()}>
                            {member.role === 'runner' && member.verificationStatus !== 'approved' && (
                              <button type="button" className="btn-action btn-approve" onClick={() => { setApproveRunner({ runner: member, action: 'approved' }); }}>
                                <Check size={14} /> {t.actions.approve}
                              </button>
                            )}
                            {member.role === 'runner' && member.verificationStatus !== 'rejected' && (
                              <button type="button" className="btn-action btn-reject" onClick={() => { setApproveRunner({ runner: member, action: 'rejected' }); }}>
                                <X size={14} /> {t.actions.reject}
                              </button>
                            )}
                            <button type="button" className={`btn-action ${member.isActive ? 'btn-suspend' : 'btn-reactivate'}`} onClick={() => ask(`${member.isActive ? t.actions.suspend : t.actions.reactivate} ${member.name}?`, () => api.setUserStatus(member._id, !member.isActive))}>
                              {member.isActive ? t.actions.suspend : t.actions.reactivate}
                            </button>
                            <button type="button" className="btn-action btn-delete" onClick={() => ask(`${t.actions.delete} user ${member.name}?`, () => api.adminDeleteUser(member._id))} title={t.actions.delete}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* RUNNERS VIEW */}
        {activeSection === 'runners' && (
          <div className="admin-content-pane">
            <div className="approvals-header">
              <h3>{t.runnersQueue}</h3>
              <p>{t.runnersQueueDesc}</p>
            </div>
            {pendingRunners.length === 0 ? (
              <div className="admin-empty-state-green"><CheckCircle2 size={44} className="text-cyan-400 mb-2" /><h4>{t.allApproved}</h4><p>There are no runners currently waiting for identity verification.</p></div>
            ) : (
              <div className="runner-approval-cards">
                {pendingRunners.map((runner) => (
                  <div key={runner._id} className="approval-card">
                    <div className="approval-photo-section">
                      {runner.avatarUrl ? <img src={runner.avatarUrl} alt={runner.name} className="approval-avatar-large" /> : <div className="approval-avatar-placeholder"><Users size={36} /></div>}
                      <span className="approval-photo-tag">{t.realPhotoRequired}</span>
                    </div>
                    <div className="approval-info-section">
                      <div className="approval-name-header"><h4>{runner.name}</h4> <span className="verify-badge verify-pending">Pending Review</span></div>
                      <div className="approval-details-grid">
                        <div><span className="detail-label"><Mail size={12} /> Email</span> <b>{runner.email}</b></div>
                        <div><span className="detail-label"><Phone size={12} /> Mobile</span> <b>{runner.phone}</b></div>
                        <div><span className="detail-label"><MapPin size={12} /> Area</span> <b>{runner.area || 'Not provided'}</b></div>
                        <div><span className="detail-label"><Calendar size={12} /> Age</span> <b>{runner.age ? `${runner.age} years old` : 'Unknown'}</b></div>
                      </div>
                      <div className="approval-actions-bar">
                        <button type="button" className="button button-primary" onClick={() => { setApproveRunner({ runner, action: 'approved' }); }}>
                          <Check size={16} /> {t.actions.approve} Runner
                        </button>
                        <button type="button" className="button button-outline" onClick={() => { setApproveRunner({ runner, action: 'rejected' }); }}>
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

        {/* TASKS VIEW */}
        {activeSection === 'tasks' && (
          <div className="admin-content-pane">
            <div className="admin-filter-bar">
              <div className="admin-search-wrap">
                <Search size={16} className="search-icon" />
                <input type="text" placeholder={t.filters.searchTasks} value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} />
              </div>
              <div className="admin-filter-pills">
                {['all', 'pending', 'accepted', 'in-transit', 'completed', 'cancelled'].map((status) => (
                  <button key={status} type="button" className={`filter-pill ${taskStatusFilter === status ? 'active' : ''}`} onClick={() => setTaskStatusFilter(status)}>
                    {status.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="admin-tasks-grid">
              {filteredTasks.length === 0 ? (
                <div className="admin-empty-state"><Package size={36} className="text-muted mb-2" /><p>{t.empty}</p></div>
              ) : (
                filteredTasks.map((task) => (
                  <article key={task._id} className="admin-task-card">
                    <div className="admin-task-top">
                      <div><span className="task-date-text">{new Date(task.createdAt).toLocaleDateString()}</span> <h4 className="task-title-text">{task.title}</h4></div>
                      <span className={`badge badge-status status-${task.status}`}>{task.status}</span>
                    </div>
                    <p className="task-desc-excerpt">{task.description}</p>
                    <div className="task-route-box">
                      <div className="route-stop"><span className="stop-dot pickup" /><div><small>Pickup</small> <b>{task.pickupAddress || 'Pickup address'}</b></div></div>
                      <div className="route-stop"><span className="stop-dot delivery" /><div><small>Delivery</small> <b>{task.deliveryAddress || 'Delivery address'}</b></div></div>
                    </div>
                    <div className="task-card-footer">
                      <span className="task-price-tag">৳ {Number(task.estimatedPrice || 0).toLocaleString()}</span>
                      <button type="button" className="btn-danger-quiet" onClick={() => ask(`${t.actions.deleteTask} "${task.title}"?`, () => api.adminDeleteTask(task._id))}>
                        <Trash2 size={14} /> {t.actions.deleteTask}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}

        {/* REPORTS VIEW */}
        {activeSection === 'reports' && (
          <div className="admin-content-pane">
            <div className="admin-reports-grid">
              {reports.length === 0 ? (
                <div className="admin-empty-state"><ShieldCheck size={36} className="text-muted mb-2" /><p>{t.noSafetyReports}</p></div>
              ) : (
                reports.map((report) => (
                  <article key={report._id} className={`admin-report-card status-${report.status}`}>
                    <div className="report-card-top">
                      <div><span className={`badge badge-status ${report.status === 'open' ? 'status-open' : 'status-reviewed'}`}>{report.status}</span> <h4>Reported by {report.reporter?.name || 'User'}</h4></div>
                      <button type="button" className="btn-danger-icon" onClick={() => ask(`${t.actions.delete} report?`, () => api.adminDeleteReport(report._id))}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="report-reason-text">"{report.reason}"</p>
                    <div className="report-card-actions">
                      <button type="button" className="button button-outline button-small" onClick={() => ask(report.status === 'open' ? t.actions.viewed : t.actions.open, () => api.adminUpdateReport(report._id, report.status === 'open' ? 'reviewed' : 'open'))}>
                        {report.status === 'open' ? t.actions.viewed : t.actions.open}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}

        {/* CONVERSATIONS VIEW */}
        {activeSection === 'conversations' && (
          <div className="admin-content-pane">
            <div className="admin-chat-split-view">
              <div className="admin-conversations-pane">
                {conversations.length === 0 ? <div className="admin-empty-state"><p>{t.empty}</p></div> : (
                  conversations.map((item) => (
                    <div key={item._id} className={`conv-list-item ${openConversation === item._id ? 'selected' : ''}`} onClick={async () => {
                      setOpenConversation(item._id);
                      try { setMessages((await api.adminConversationMessages(item._id)).messages || []); } catch (err) { onNotice?.(err.message); }
                    }}>
                      <div><b>{item.job?.title || 'Job Thread'}</b> <span>{(item.participants || []).map((p) => p.name).join(' · ')}</span></div>
                      <button type="button" className="btn-danger-icon" onClick={(e) => { e.stopPropagation(); ask(`${t.actions.delete} conversation?`, () => api.adminDeleteConversation(item._id)); }} title="Delete Conversation">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="admin-messages-pane">
                {openConversation ? (
                  <div className="messages-stream">
                    <div className="messages-stream-header"><strong>{t.messageHistory}</strong></div>
                      {messages.length === 0 ? <p className="no-msgs-note">{t.noMessages}</p> : (
                      messages.map((msg) => (
                        <div key={msg._id} className="stream-msg-bubble">
                          <div className="stream-msg-meta"><b>{msg.sender?.name || 'System'}</b> <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                          {msg.imageUrl && <img src={msg.imageUrl} alt="Attached" className="stream-msg-image" />}
                          <p>{msg.text}</p>
                          <button type="button" className="msg-del-link" onClick={() => ask(`${t.actions.delete} message?`, () => api.adminDeleteMessage(msg._id))}>
                            <Trash2 size={11} /> delete
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="messages-placeholder"><MessageSquare size={32} className="text-muted mb-2" /><p>{t.selectConversation}</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS VIEW */}
        {activeSection === 'settings' && (
          <div className="admin-content-pane admin-settings-pane">
            <div className="admin-settings-grid">
              <section className="admin-settings-card">
                <div className="admin-section-header">
                  <h3>{isBn ? 'অ্যাকাউন্ট আপডেট' : 'Account Update'}</h3>
                  <p>{isBn ? 'এখান থেকে ইমেইল, ফোন নম্বর ও পাসওয়ার্ড আপডেট করুন।' : 'Update your email, phone number, and password from here.'}</p>
                </div>

                <div className="admin-settings-block">
                  <h4 className="admin-settings-subtitle">{isBn ? 'ইমেইল বা ফোন পরিবর্তন' : 'Change email or phone'}</h4>
                  <form className="admin-subadmin-form" onSubmit={accountSent ? verifyAccountCode : sendAccountCode}>
                    <div className="admin-form-grid">
                      <div className="admin-field">
                        <label>{isBn ? 'ধরন' : 'Type'}</label>
                        <select value={accountKind} onChange={(e) => { setAccountKind(e.target.value); setAccountSent(false); setAccountCode(''); setAccountNotice(''); setAccountError(''); }}>
                          <option value="email">{t.emailLabel}</option>
                          <option value="phone">{isBn ? 'ফোন' : 'Phone'}</option>
                        </select>
                      </div>
                      <div className="admin-field">
                        <label>{accountKind === 'email' ? (isBn ? 'নতুন ইমেইল' : 'New email') : (isBn ? 'নতুন ফোন নম্বর' : 'New phone number')}</label>
                        <input value={accountValue} onChange={(e) => setAccountValue(e.target.value)} required placeholder={accountKind === 'email' ? 'name@example.com' : '01XXXXXXXXX'} />
                      </div>
                      {accountSent && (
                        <div className="admin-field">
                          <label>{isBn ? 'যাচাই কোড' : 'Verification code'}</label>
                          <input inputMode="numeric" maxLength="6" value={accountCode} onChange={(e) => setAccountCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" required />
                        </div>
                      )}
                      {accountError && <p className="settings-error" role="alert">{accountError}</p>}
                      {accountNotice && <p className="settings-success" role="status">{accountNotice}</p>}
                      <button className="button button-primary button-full" type="submit" disabled={accountBusy}>
                        {accountBusy ? (accountSent ? (isBn ? 'যাচাই হচ্ছে...' : 'Verifying...') : (isBn ? 'পাঠানো হচ্ছে...' : 'Sending...')) : (accountSent ? (isBn ? 'যাচাই ও আপডেট' : 'Verify & update') : (isBn ? 'কোড পাঠান' : 'Send code'))}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="admin-settings-block">
                  <h4 className="admin-settings-subtitle">{isBn ? 'পাসওয়ার্ড পরিবর্তন' : 'Change password'}</h4>
                  <form className="admin-subadmin-form" onSubmit={changePassword}>
                    <div className="admin-form-grid">
                      <div className="admin-field">
                        <label>{isBn ? 'বর্তমান পাসওয়ার্ড' : 'Current password'}</label>
                        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                      </div>
                      <div className="admin-field">
                        <label>{isBn ? 'নতুন পাসওয়ার্ড' : 'New password'}</label>
                        <input type="password" minLength="8" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                      </div>
                      {passwordError && <p className="settings-error" role="alert">{passwordError}</p>}
                      {passwordNotice && <p className="settings-success" role="status">{passwordNotice}</p>}
                      <button className="button button-primary button-full" type="submit" disabled={passwordBusy}>
                        {passwordBusy ? (isBn ? 'আপডেট হচ্ছে...' : 'Updating...') : (isBn ? 'পাসওয়ার্ড আপডেট করুন' : 'Update password')}
                      </button>
                    </div>
                  </form>
                </div>
              </section>

              <section className="admin-settings-card admin-subadmin-section">
                <div className="admin-section-header">
                  <h3>{t.subAdminTitle}</h3>
                  <p>{t.subAdminSubtitle}</p>
                </div>

                <form className="admin-subadmin-form" onSubmit={saveSubAdmin}>
                  <div className="admin-form-grid">
                    <div className="admin-field">
                      <label>{t.nameLabel}</label>
                      <input placeholder="Full name" value={newSubAdmin.name} onChange={(e) => setNewSubAdmin({ ...newSubAdmin, name: e.target.value })} required minLength="2" />
                    </div>
                    <div className="admin-field">
                      <label>{t.emailLabel}</label>
                      <input type="email" placeholder="name@example.com" value={newSubAdmin.email} onChange={(e) => setNewSubAdmin({ ...newSubAdmin, email: e.target.value })} required />
                    </div>
                    <div className="admin-field password-field">
                      <label>{t.passwordLabel}</label>
                      <div className="password-input-wrap">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t.passwordPlaceholder}
                          value={newSubAdmin.password}
                          onChange={(e) => setNewSubAdmin({ ...newSubAdmin, password: e.target.value })}
                          minLength="12"
                          required
                        />
                        <button type="button" className="btn-toggle-password" onClick={() => setShowPassword(!showPassword)} aria-label={t.eyeLabel} title={showPassword ? t.toggleHide : t.toggleShow}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div className="password-strength">
                        <span className="strength-label">{t.passwordStrength}</span>
                        <div className="strength-bar">
                          <div className={`strength-fill strength-${passwordStrength(newSubAdmin.password)}`} />
                        </div>
                        <span className="strength-text">{passwordLabelText(newSubAdmin.password)}</span>
                      </div>
                    </div>
                    <div className="admin-permissions">
                      <label className="admin-permission-label">{t.permissionsLabel}</label>
                      <div className="admin-permission-group">
                        {[['users', t.permissions.users], ['runner_approval', t.permissions.runner_approval], ['tasks', t.permissions.tasks], ['reports', t.permissions.reports]].map(([key, label]) => (
                          <label key={key} className="admin-permission-chip">
                            <input type="checkbox" checked={newSubAdmin.permissions.includes(key)} onChange={(e) => setNewSubAdmin({ ...newSubAdmin, permissions: e.target.checked ? [...new Set([...newSubAdmin.permissions, key])] : newSubAdmin.permissions.filter((p) => p !== key) })} />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <button className="button button-primary button-full" type="submit" disabled={loading}>{t.addSubAdmin}</button>
                  </div>
                </form>

                {subAdmins.length > 0 && (
                  <div className="admin-subadmin-list">
                    <div className="admin-list-header"><span>{t.currentSubAdmins}</span> <span className="admin-list-count">{subAdmins.length}</span></div>
                    <ul>
                      {subAdmins.map((admin) => (
                        <li key={admin.email} className="admin-list-item">
                          <div className="admin-list-info">
                            <div className="admin-list-avatar">{admin.name?.[0]?.toUpperCase() || '?'}</div>
                            <div><b>{admin.name}</b> <small>{admin.email}</small></div>
                          </div>
                          <div className="admin-list-meta">
                            <span className="admin-permissions">{admin.permissions.join(', ')}</span>
                            <span className={`badge badge-status status-${admin.isActive === false ? 'suspended' : 'active'}`}>{admin.isActive === false ? 'Suspended' : 'Active'}</span>
                          </div>
                          <div className="admin-list-actions">
                            {isSuperAdmin && (
                              <button type="button" className="button button-outline button-small btn-delete-subadmin" onClick={() => removeSubAdmin(admin.email)} title={t.remove} aria-label={t.remove}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* AUDIT LOG VIEW */}
        {activeSection === 'audit' && (
          <div className="admin-content-pane">
            <div className="admin-filter-bar">
              <div className="admin-search-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder={isBn ? 'অডিট লগ খুঁজুন...' : 'Search audit logs...'}
                  value={auditSearch}
                  onChange={(e) => { setAuditSearch(e.target.value); setAuditVisibleCount(7); }}
                />
              </div>
            </div>

            <div className="admin-audit-stream">
              {logs.length === 0 ? (
                <div className="admin-empty-state"><p>{t.empty}</p></div>
              ) : filteredLogs.length === 0 ? (
                <div className="admin-empty-state"><p>{t.empty}</p></div>
              ) : (
                <>
                  {visibleLogs.map((log) => (
                    <div key={log._id} className="audit-row">
                      <span className="audit-icon-marker" />
                      <div className="audit-content">
                        <div className="audit-title-row"><b>{log.actor?.name || 'Admin'}</b> <span className="audit-action-tag">{log.action}</span> <span className="audit-time">{new Date(log.createdAt).toLocaleString()}</span></div>
                        <span className="audit-target-text">Target: {log.targetType} ({log.targetId})</span>
                      </div>
                    </div>
                  ))}
                  <div className="audit-load-actions">
                    {filteredLogs.length > auditVisibleCount && (
                      <button type="button" className="button button-outline button-small" onClick={() => setAuditVisibleCount((c) => c + 5)}>
                        {isBn ? 'আরও দেখুন' : 'Show more'} (+5)
                      </button>
                    )}
                    {auditVisibleCount > 7 && (
                      <button type="button" className="button button-outline button-small" onClick={() => setAuditVisibleCount(7)}>
                        {isBn ? 'কম দেখুন' : 'Show less'}
                      </button>
                    )}
                    <span className="audit-count-note">
                      {isBn ? `দেখানো হচ্ছে ${visibleLogs.length}/${filteredLogs.length}` : `Showing ${visibleLogs.length}/${filteredLogs.length}`}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* INSPECTION MODAL */}
        {inspectedUser && (
          <div className="admin-modal-overlay" onClick={() => setInspectedUser(null)} role="dialog" aria-modal="true" aria-label={t.userVerificationDetails}>
            <div className="admin-inspect-modal admin-inspect-modal-pro" onClick={(e) => e.stopPropagation()}>
              <div className="inspect-modal-header">
                <div>
                  <h3>{t.userVerificationDetails}</h3>
                  <p className="inspect-modal-subtitle">{inspectedUser.name || '—'}</p>
                </div>
                <button type="button" onClick={() => setInspectedUser(null)} className="text-button inspect-close-btn" aria-label={t.actions.close}><X size={18} /></button>
              </div>
              <div className="inspect-modal-body">
                <div className="inspect-hero">
                  <div className="inspect-photo-center">
                    {inspectedUser.avatarUrl ? <img src={inspectedUser.avatarUrl} alt={inspectedUser.name} className="inspect-large-avatar" /> : <div className="inspect-large-avatar placeholder"><Users size={44} /></div>}
                  </div>
                  <div className="inspect-hero-meta">
                    <div className="inspect-hero-name">{inspectedUser.name || '—'}</div>
                    <div className="inspect-hero-tags">
                      <span className={`role-tag role-${inspectedUser.role}`}>{inspectedUser.role || 'user'}</span>
                      <span className={`status-badge status-${inspectedUser.isActive ? 'active' : 'suspended'}`}>{inspectedUser.isActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'স্থগিত' : 'Suspended')}</span>
                      {inspectedUser.role === 'runner' && <span className={`verify-badge verify-${inspectedUser.verificationStatus || 'approved'}`}>{inspectedUser.verificationStatus || 'approved'}</span>}
                    </div>
                  </div>
                </div>

                <div className="inspect-info-grid">
                  <div className="inspect-info-item"><span>Full Name</span><b>{inspectedUser.name || '—'}</b></div>
                  <div className="inspect-info-item"><span>Email Address</span><b>{inspectedUser.email || '—'}</b></div>
                  <div className="inspect-info-item"><span>Mobile Number</span><b>{inspectedUser.phone || '—'}</b></div>
                  <div className="inspect-info-item"><span>Living Area</span><b>{inspectedUser.area || 'Not provided'}</b></div>
                  <div className="inspect-info-item"><span>Age</span><b>{inspectedUser.age ? `${inspectedUser.age} years` : 'Not provided'}</b></div>
                  {inspectedUser.emergencyContact && <div className="inspect-info-item"><span>Emergency Contact</span><b>{inspectedUser.emergencyContact}</b></div>}
                  <div className="inspect-info-item"><span>Account Status</span><b>{inspectedUser.isActive ? 'Active' : 'Suspended'}</b></div>
                  {inspectedUser.role === 'runner' && <div className="inspect-info-item"><span>Verification</span><b className="capitalize">{inspectedUser.verificationStatus || 'approved'}</b></div>}
                  {inspectedUser.role === 'runner' && <div className="inspect-info-item"><span>Rating</span><b>★ {inspectedUser.avgRating ?? '5.0'} ({inspectedUser.reviewCount || 0})</b></div>}
                </div>
              </div>
              <div className="inspect-modal-footer">
                <button type="button" className="button button-outline" onClick={() => setInspectedUser(null)}>{t.actions.close}</button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRM DIALOG */}
        <ConfirmDialog
          open={Boolean(confirm)}
          title={t.confirmTitle || 'Please Confirm Action'}
          message={confirm?.message || ''}
          danger
          confirmLabel={isBn ? 'হ্যাঁ' : 'Yes'}
          cancelLabel={isBn ? 'না' : 'No'}
          onCancel={() => setConfirm(null)}
          onConfirm={runConfirmed}
        />

        {/* RUNNER APPROVAL DIALOG */}
        <ConfirmDialog
          open={Boolean(approveRunner)}
          title={approveRunner?.action === 'approved' ? (isBn ? 'রানার অনুমোদন করবেন?' : 'Approve Runner?') : (isBn ? 'রানার প্রত্যাখ্যান করবেন?' : 'Reject Runner?')}
          message={`approveRunner?.runner?.name` ? `${approveRunner?.runner?.name}(${approveRunner?.runner?.email})` : ''}
          danger={approveRunner?.action === 'rejected'}
          confirmLabel={isBn ? 'হ্যাঁ' : 'Yes'}
          cancelLabel={isBn ? 'না' : 'No'}
          onCancel={() => setApproveRunner(null)}
          onConfirm={runApproveRunner}
        />
      </main>
    </section>
  );
}

function passwordStrength(password) {
  if (!password) return 'empty';
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

function passwordLabelText(password) {
  const s = passwordStrength(password);
  if (!password) return '';
  return s === 'weak' ? 'Weak' : s === 'medium' ? 'Medium' : 'Strong';
}
