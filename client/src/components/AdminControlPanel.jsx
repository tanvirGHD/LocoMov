import { useEffect, useState } from 'react';
import { api } from '../api';
import ConfirmDialog from './ConfirmDialog';

export default function AdminControlPanel({ language, onNotice, onUsersChange, users }) {
  const isBn = language === 'bn';
  const t = isBn ? {
    users: 'ব্যবহারকারী',
    reviews: 'রিভিউ',
    chats: 'কথোপকথন',
    reports: 'রিপোর্ট',
    audit: 'অডিট লগ',
    suspend: 'স্থগিত',
    reactivate: 'সক্রিয়',
    approve: 'অনুমোদন',
    reject: 'প্রত্যাখ্যান',
    delete: 'মুছুন',
    viewed: 'দেখা হয়েছে',
    open: 'খোলা',
    confirmTitle: 'নিশ্চিত করুন',
    empty: 'কোনো তথ্য নেই',
  } : {
    users: 'Users',
    reviews: 'Reviews',
    chats: 'Conversations',
    reports: 'Reports',
    audit: 'Audit log',
    suspend: 'Suspend',
    reactivate: 'Reactivate',
    approve: 'Approve',
    reject: 'Reject',
    delete: 'Delete',
    viewed: 'Mark reviewed',
    open: 'Reopen',
    confirmTitle: 'Please confirm',
    empty: 'Nothing here yet',
  };

  const [tab, setTab] = useState('users');
  const [reviews, setReviews] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [openConversation, setOpenConversation] = useState(null);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [confirm, setConfirm] = useState(null);

  async function loadTab(next = tab) {
    try {
      if (next === 'reviews') setReviews((await api.adminReviews()).reviews || []);
      if (next === 'chats') setConversations((await api.adminConversations()).conversations || []);
      if (next === 'reports') setReports((await api.adminReports()).reports || []);
      if (next === 'audit') setLogs((await api.adminAudit()).logs || []);
    } catch (error) {
      onNotice(error.message);
    }
  }

  useEffect(() => { loadTab(tab); }, [tab]);

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
      onNotice(error.message);
    }
  }

  return (
    <section className="panel admin-control-panel">
      <div className="admin-tabs">
        {['users', 'reviews', 'chats', 'reports', 'audit'].map((id) => (
          <button key={id} type="button" className={`admin-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{t[id]}</button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="admin-users-list">
          {(users || []).length === 0 ? <p className="admin-empty">{t.empty}</p> : users.map((member) => (
            <article className="admin-user-row" key={member._id}>
              <span className="admin-user-avatar">{member.name.slice(0, 1).toUpperCase()}</span>
              <div className="admin-user-details">
                <b>{member.name}</b>
                <span>{member.email}</span>
              </div>
              <span className={`admin-role-badge role-${member.role}`}>{member.role}</span>
              <span className={`admin-account-status ${member.isActive ? 'active' : 'inactive'}`}>{member.isActive ? 'active' : 'suspended'}</span>
              {member.role === 'runner' && <span className={`admin-account-status ${member.verificationStatus === 'approved' ? 'active' : 'inactive'}`}>{member.verificationStatus || 'approved'}</span>}
              {member.role !== 'admin' && (
                <div className="admin-row-actions">
                  <button className="button button-outline button-small" onClick={() => ask(`${member.isActive ? t.suspend : t.reactivate} ${member.name}?`, () => api.setUserStatus(member._id, !member.isActive))}>
                    {member.isActive ? t.suspend : t.reactivate}
                  </button>
                  {member.role === 'runner' && member.verificationStatus !== 'approved' && (
                    <button className="button button-primary button-small" onClick={() => ask(`${t.approve} ${member.name}?`, () => api.setRunnerVerification(member._id, 'approved'))}>{t.approve}</button>
                  )}
                  {member.role === 'runner' && member.verificationStatus !== 'rejected' && (
                    <button className="button button-outline button-small" onClick={() => ask(`${t.reject} ${member.name}?`, () => api.setRunnerVerification(member._id, 'rejected'))}>{t.reject}</button>
                  )}
                  <button className="text-button text-danger" onClick={() => ask(`${t.delete} ${member.name}?`, () => api.adminDeleteUser(member._id))}>{t.delete}</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {tab === 'reviews' && (
        <div className="admin-table-list">
          {reviews.length === 0 ? <p className="admin-empty">{t.empty}</p> : reviews.map((review) => (
            <article className="admin-table-row" key={review._id}>
              <div>
                <b>{review.reviewer?.name} → {review.reviewee?.name}</b>
                <span>{review.task?.title} · {review.rating}★</span>
                {review.comment && <p>{review.comment}</p>}
              </div>
              <button className="text-button text-danger" onClick={() => ask(`${t.delete} review?`, () => api.adminDeleteReview(review._id))}>{t.delete}</button>
            </article>
          ))}
        </div>
      )}

      {tab === 'chats' && (
        <div className="admin-table-list">
          {conversations.length === 0 ? <p className="admin-empty">{t.empty}</p> : conversations.map((item) => (
            <article className="admin-table-row" key={item._id}>
              <button type="button" className="text-button" onClick={async () => {
                setOpenConversation(item._id);
                try {
                  setMessages((await api.adminConversationMessages(item._id)).messages || []);
                } catch (error) {
                  onNotice(error.message);
                }
              }}>
                <b>{item.job?.title || 'Job'}</b>
                <span>{(item.participants || []).map((person) => person.name).join(' · ')}</span>
              </button>
              <button className="text-button text-danger" onClick={() => ask(`${t.delete} conversation?`, () => api.adminDeleteConversation(item._id))}>{t.delete}</button>
            </article>
          ))}
          {openConversation && (
            <div className="admin-message-list">
              {messages.map((message) => (
                <div key={message._id} className="admin-message-row">
                  <span>{message.sender?.name || 'System'}: {message.text || message.type}</span>
                  <button className="text-button text-danger" onClick={() => ask(`${t.delete} message?`, () => api.adminDeleteMessage(message._id))}>{t.delete}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className="admin-table-list">
          {reports.length === 0 ? <p className="admin-empty">{t.empty}</p> : reports.map((report) => (
            <article className="admin-table-row" key={report._id}>
              <div>
                <b>{report.reporter?.name}</b>
                <span>{report.status} · {report.reason}</span>
              </div>
              <div className="admin-row-actions">
                <button className="button button-outline button-small" onClick={() => ask(report.status === 'open' ? t.viewed : t.open, () => api.adminUpdateReport(report._id, report.status === 'open' ? 'reviewed' : 'open'))}>
                  {report.status === 'open' ? t.viewed : t.open}
                </button>
                <button className="text-button text-danger" onClick={() => ask(`${t.delete} report?`, () => api.adminDeleteReport(report._id))}>{t.delete}</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <div className="admin-table-list">
          {logs.length === 0 ? <p className="admin-empty">{t.empty}</p> : logs.map((log) => (
            <article className="admin-table-row" key={log._id}>
              <div>
                <b>{log.actor?.name} · {log.action}</b>
                <span>{log.targetType} · {new Date(log.createdAt).toLocaleString()}</span>
              </div>
            </article>
          ))}
        </div>
      )}

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
