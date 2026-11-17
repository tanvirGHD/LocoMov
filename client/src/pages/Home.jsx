import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import ChatPanel from '../components/ChatPanel';
import ReviewModal from '../components/ReviewModal';
import AdminControlPanel from '../components/AdminControlPanel';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { Bike, MapPin, ShieldCheck, Eye, EyeOff, Globe2, Home as HomeIcon, Settings, Package } from 'lucide-react';
import { groupTasks, ACTIVE_STATUSES, PENDING_STATUSES, DONE_STATUSES, CANCELLED_STATUSES } from '../utils/taskStatus';

const dhaka = [23.8103, 90.4126];
const taskIcon = L.divIcon({ className: 'map-marker-wrap', html: '<span class="map-marker"><i></i></span>', iconSize: [26, 34], iconAnchor: [13, 30] });
const pinIcon = L.divIcon({ className: 'map-marker-wrap', html: '<span class="map-marker"><i></i></span>', iconSize: [26, 34], iconAnchor: [13, 30] });

const statusNamesByLanguage = {
  en: {
    pending: 'Looking for runner',
    accepted: 'Runner assigned',
    'picked-up': 'Parcel picked up',
    'in-transit': 'Runner is on the way',
    arriving: 'Near destination',
    completed: 'Delivered',
    cancelled: 'Cancelled',
  },
  bn: {
    pending: 'রানার খুঁজছে',
    accepted: 'রানার পেয়েছে',
    'picked-up': 'পার্সেল পেয়েছে',
    'in-transit': 'রানার পথে আছে',
    arriving: 'কাছাকাছি পৌঁছাচ্ছে',
    completed: 'ডেলিভার হয়েছে',
    cancelled: 'বাতিল',
  },
};
const deliveryStagesByLanguage = {
  en: [
    { status: 'picked-up', label: 'Parcel picked up' },
    { status: 'in-transit', label: 'Departed' },
    { status: 'arriving', label: 'Nearby' },
    { status: 'completed', label: 'Delivered' },
  ],
  bn: [
    { status: 'picked-up', label: 'পার্সেল পেয়েছে' },
    { status: 'in-transit', label: 'রওনা হয়েছে' },
    { status: 'arriving', label: 'কাছাকাছি' },
    { status: 'completed', label: 'ডেলিভার হয়েছে' },
  ],
};

function coordinates(location) {
  if (!location?.coordinates || location.coordinates.length !== 2) return null;
  return [location.coordinates[1], location.coordinates[0]];
}

function money(value) {
  return `৳ ${Number(value || 0).toLocaleString('bn-BD')}`;
}

function MapPickerEvents({ onSelect, selectedPosition }) {
  const map = useMap();
  useEffect(() => {
    if (selectedPosition) map.setView(selectedPosition, Math.max(map.getZoom(), 16));
  }, [map, selectedPosition]);
  useMapEvents({
    click(event) {
      onSelect([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

async function fetchLocationSuggestions(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&countrycodes=bd&q=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function LocationFields({ prefix, label, values, onChange, selectedPosition, onSelectPosition, onNotice }) {
  const [expanded, setExpanded] = useState(false);
  const [largeView, setLargeView] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);

  useEffect(() => {
    const query = (values[`${prefix}Address`] || '').trim();
    if (query.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearchingLocation(true);
      const items = await fetchLocationSuggestions(query);
      if (active) {
        setSuggestions(items);
        setSearchingLocation(false);
      }
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
      setSearchingLocation(false);
    };
  }, [prefix, values]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      onNotice('এই ব্রাউজারে অবস্থান সুবিধা নেই');
      return;
    }
    navigator.geolocation.getCurrentPosition(({ coords: point }) => {
      onSelectPosition([point.latitude, point.longitude]);
      onChange(`${prefix}Address`, `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`);
      setExpanded(true);
      onNotice('');
    }, () => onNotice('অবস্থান ব্যবহারের অনুমতি পাওয়া যায়নি'));
  }

  function chooseSuggestion(item) {
    const coords = [Number(item.lat), Number(item.lon)];
    onSelectPosition(coords);
    onChange(`${prefix}Address`, item.display_name);
    setSuggestions([]);
    setExpanded(true);
  }

  return (
    <div className={`location-picker ${expanded ? 'location-picker-expanded' : ''}`}>
      <label>{label} ঠিকানা
        <input
          required
          minLength="3"
          maxLength="240"
          placeholder="বাড়ি, রাস্তা, এলাকা"
          value={values[`${prefix}Address`]}
          onChange={(event) => {
            onChange(`${prefix}Address`, event.target.value);
            if (!event.target.value.trim()) setSuggestions([]);
          }}
        />
      </label>
      {suggestions.length > 0 && (
        <div className="location-suggestions">
          {suggestions.map((item) => (
            <button type="button" key={`${prefix}-${item.place_id || item.display_name}`} className="location-suggestion-item" onClick={() => chooseSuggestion(item)}>
              <strong>{item.display_name.split(',').slice(0, 3).join(', ')}</strong>
              <small>{item.display_name}</small>
            </button>
          ))}
        </div>
      )}
      {searchingLocation && <div className="location-searching">লোকেশন খুঁজছি...</div>}
      <div className="location-picker-actions">
        <button type="button" className="text-button" onClick={() => setExpanded((open) => !open)}>
          {expanded ? 'মানচিত্র বন্ধ করুন' : selectedPosition ? 'মানচিত্রে স্থান বদলান' : 'মানচিত্রে স্থান বাছাই করুন'}
        </button>
        <button type="button" className="text-button" onClick={useCurrentLocation}>◎ বর্তমান অবস্থান</button>
      </div>
      {expanded && <div className="location-map-wrap">
        <div className="location-map-toolbar">
          <span>পিন বসাতে মানচিত্রে চাপ দিন</span>
          <button type="button" className="text-button" onClick={() => setLargeView((large) => !large)}>
            {largeView ? 'ছোট দেখুন' : 'বড় করে দেখুন'}
          </button>
        </div>
        <MapContainer
          center={selectedPosition || dhaka}
          zoom={selectedPosition ? 16 : 12}
          maxZoom={19}
          scrollWheelZoom
          doubleClickZoom
          zoomControl
          className={`location-map ${largeView ? 'location-map-large' : ''}`}
          key={`${prefix}-map`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapPickerEvents onSelect={onSelectPosition} selectedPosition={selectedPosition} />
          {selectedPosition && <Marker position={selectedPosition} icon={pinIcon} />}
        </MapContainer>
        <p className="map-pick-hint">{selectedPosition ? 'স্থান বাছাই হয়েছে। ভুল হলে মানচিত্রে অন্য জায়গায় চাপ দিন।' : 'মানচিত্রে জুম করে সঠিক স্থানে চাপ দিয়ে পিন বসান।'}</p>
      </div>}
      <span className={selectedPosition ? 'location-selected' : 'location-required'}>
        {selectedPosition ? '✓ মানচিত্রে লোকেশন বাছাই করা হয়েছে' : 'কাজ পোস্ট করতে মানচিত্রে লোকেশন বাছাই করুন'}
      </span>
    </div>
  );
}

function StatCard({ icon, label, value, tone = '', language = 'en' }) {
  const locale = language === 'bn' ? 'bn-BD' : 'en-US';
  const displayValue = typeof value === 'number' ? value.toLocaleString(locale) : value || (language === 'bn' ? '০' : '0');
  return <article className={`stat-card ${tone}`}><span className="stat-icon">{icon}</span><div><span>{label}</span><b>{displayValue}</b></div></article>;
}

function TaskCard({ task, user, onRefresh, onError, bids, setBids, runnerPosition, statusNames, deliveryStages, copy, onOpenChat, onReview, selected, onToggleSelect, onAdminEdit, onAdminDelete }) {
  const [otp, setOtp] = useState('');
  const [bidForm, setBidForm] = useState({ proposedPrice: task.estimatedPrice, deliveryTime: 30 });
  const [loading, setLoading] = useState(false);
  const [bidLoading, setBidLoading] = useState(false);
  const isRunner = user.role === 'runner';
  const isAdmin = ['admin', 'super_admin', 'sub_admin'].includes(user.role);
  const canChat = !isAdmin && !!task.runnerId && ['accepted', 'picked-up', 'in-transit', 'arriving', 'completed', 'cancelled'].includes(task.status);
  const chatReadOnly = ['completed', 'cancelled'].includes(task.status) && !!(task.completedAt || task.cancelledAt) && Date.now() - new Date(task.completedAt || task.cancelledAt).getTime() > 48 * 60 * 60 * 1000;
  const canCancel = ['pending', 'accepted'].includes(task.status);
  const canDeletePost = user.role === 'customer' &&
    String(task.customerId?._id || task.customerId) === String(user.id) &&
    task.status === 'pending' &&
    !task.runnerId;
  const isCustomerOwner = user.role === 'customer' && String(task.customerId?._id || task.customerId) === String(user.id);
  const canReview = isCustomerOwner && ['completed', 'delivered'].includes(task.status) && !!task.runnerId && !task.customerRating;
  const pickup = coordinates(task.pickupLocation);
  const delivery = coordinates(task.deliveryLocation);
  const dateLabel = new Date(task.createdAt).toLocaleDateString(copy.dateLocale, { day: 'numeric', month: 'short' });

  async function act(action) {
    if (action === 'delete' && !window.confirm(copy.confirmDelete)) return;
    setLoading(true);
    onError('');
    try {
      if (action === 'accept') {
        const position = runnerPosition || (task.pickupLocation?.coordinates ? [task.pickupLocation.coordinates[1], task.pickupLocation.coordinates[0]] : dhaka);
        await api.acceptTask(task._id, { latitude: position[0], longitude: position[1] });
      } else if (action === 'pickup') {
        await api.verifyPickup(task._id, otp);
      } else if (action === 'delivery') {
        await api.verifyDelivery(task._id, otp);
      } else if (action === 'depart' || action === 'arriving') {
        await api.updateDeliveryStatus(task._id, action === 'depart' ? 'in-transit' : 'arriving');
      } else if (action === 'cancel') {
        if (isAdmin && !window.confirm(copy.cancelTask + '?')) return;
        await api.cancelTask(task._id, copy.cancelReason);
      } else if (action === 'delete') {
        await api.deleteTask(task._id);
      } else if (action === 'dispute') {
        const reason = window.prompt(copy.disputePrompt);
        if (!reason) return;
        await api.reportDispute(task._id, reason);
      }
      if (action === 'pickup' || action === 'delivery') setOtp('');
      await onRefresh();
      if (action === 'delete') onError(copy.deleteSuccess);
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendBid(event) {
    event.preventDefault();
    setBidLoading(true);
    onError('');
    try {
      const position = runnerPosition || (task.pickupLocation?.coordinates ? [task.pickupLocation.coordinates[1], task.pickupLocation.coordinates[0]] : dhaka);
      await api.createBid(task._id, {
        proposedPrice: Number(bidForm.proposedPrice),
        deliveryTime: Number(bidForm.deliveryTime),
      }, { latitude: position[0], longitude: position[1] });
      onError(copy.bidSent);
      setBidForm((current) => ({ ...current, proposedPrice: Number(current.proposedPrice) }));
    } catch (error) {
      onError(error.message);
    } finally {
      setBidLoading(false);
    }
  }

  async function resolve() {
    const resolution = window.prompt(copy.resolutionPrompt);
    if (!resolution) return;
    const faultChoice = window.prompt(copy.faultPrompt, copy.faultDefault)?.trim();
    const faultMap = {
      '0': 'none',
      '০': 'none',
      '1': 'runner',
      '১': 'runner',
      '2': 'customer',
      '২': 'customer',
    };
    const fault = faultMap[faultChoice];
    if (!fault) {
      onError(copy.invalidFault);
      return;
    }
    try {
      await api.resolveDispute(task._id, resolution, fault);
      await onRefresh();
    } catch (error) {
      onError(error.message);
    }
  }

  return (
    <article className="task-card" id={`task-card-${task._id}`}>
      <div className="task-card-top">
        {isAdmin && <label className="admin-select"><input type="checkbox" checked={Boolean(selected)} onChange={() => onToggleSelect?.(task._id)} /> {copy.select}</label>}
        <span className={`status-pill status-${task.status}`}>{statusNames[task.status] || task.status}</span>
        <span className="task-date">{dateLabel}</span>
      </div>
      <h3>{task.title}</h3>
      <p className="task-description">{task.description}</p>
      <div className="task-route">
        <span className="route-point route-start" /><div><small>{copy.pickup}</small><b>{task.pickupAddress || task.pickupLocation?.address || copy.noAddress}</b></div>
        <span className="route-dash" />
        <span className="route-point route-end" /><div><small>{copy.delivery}</small><b>{task.deliveryAddress || task.deliveryLocation?.address || copy.noAddress}</b></div>
      </div>
      <div className="task-meta">
        <div><small>{copy.budget}</small><b>{money(task.finalPrice ?? task.estimatedPrice)}</b></div>
        <div><small>{isRunner ? copy.customer : copy.runner}</small><b>{isRunner ? task.customerId?.name || copy.localCustomer : task.runnerId?.name || copy.notAvailable}</b></div>
        {task.disputeStatus === 'open' && <span className="dispute-pill">{copy.disputeOpen}</span>}
      </div>
      {user.role !== 'customer' && ['accepted', 'picked-up', 'in-transit', 'arriving', 'completed'].includes(task.status) && <ol className="delivery-progress" aria-label={copy.progressLabel}>
        {deliveryStages.filter((stage) => stage.status === task.status).map((stage) => (
          <li key={stage.status} className="stage-item stage-current">
            <span className="stage-marker">●</span><small>{stage.label}</small>
          </li>
        ))}
      </ol>}
      {user.role !== 'customer' && ['accepted', 'picked-up', 'in-transit', 'arriving'].includes(task.status) && (task.pickupOTP || task.deliveryOTP) &&
        <div className="customer-otp"><span>{copy.secureShare}</span><b>{copy.otpText}: {task.pickupOTP} <i>·</i> {copy.deliveryOtpText}: {task.deliveryOTP}</b></div>}
      {user.role === 'runner' && task.status === 'accepted' && <form className="otp-form" onSubmit={(event) => { event.preventDefault(); act('pickup'); }}>
        <label>{copy.customerOtp}<input inputMode="numeric" maxLength="4" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder={copy.otpPlaceHolder} required /></label>
        <button className="button button-primary button-small" disabled={loading}>{loading ? copy.verifying : copy.confirmPickup}</button>
      </form>}
      {user.role === 'runner' && task.status === 'picked-up' && <div className="runner-stage-action">
        <p>{copy.orderPicked}</p>
        <button className="button button-primary button-small" onClick={() => act('depart')} disabled={loading}>{loading ? copy.updating : copy.departed}</button>
      </div>}
      {user.role === 'runner' && task.status === 'in-transit' && <div className="runner-stage-action">
        <p>{copy.nearDestination}</p>
        <button className="button button-primary button-small" onClick={() => act('arriving')} disabled={loading}>{loading ? copy.updating : copy.nearby}</button>
      </div>}
      {user.role === 'runner' && task.status === 'arriving' && <form className="otp-form" onSubmit={(event) => { event.preventDefault(); act('delivery'); }}>
        <label>{copy.deliveryOtpLabel}<input inputMode="numeric" maxLength="4" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder={copy.otpPlaceHolder} required /></label>
        <button className="button button-primary button-small" disabled={loading}>{loading ? copy.verifying : copy.confirmDelivery}</button>
      </form>}
      {task.disputeStatus === 'open' && isAdmin && <button className="button button-primary button-small" onClick={resolve}>{copy.resolveIssue}</button>}
      {task.disputeStatus === 'open' && <p className="dispute-reason">{copy.reasonLabel}: {task.disputeReason}</p>}
      {task.status === 'pending' && isRunner && <div className="runner-task-actions">
        <button className="button button-primary button-small" onClick={() => act('accept')} disabled={loading}>{loading ? copy.waiting : copy.takeJob}</button>
        <form className="bid-form" onSubmit={sendBid}>
          <label>{copy.offer} ৳<input type="number" min="1" max={Math.min(user.runnerLimit, task.estimatedPrice)} value={bidForm.proposedPrice} onChange={(event) => setBidForm({ ...bidForm, proposedPrice: event.target.value })} required /></label>
          <label>{copy.minutes}<input type="number" min="1" max={10080} value={bidForm.deliveryTime} onChange={(event) => setBidForm({ ...bidForm, deliveryTime: event.target.value })} required /></label>
          <button className="button button-outline button-small" disabled={bidLoading}>{bidLoading ? copy.sending : copy.sendOffer}</button>
        </form>
      </div>}
      {user.role !== 'customer' && canChat && onOpenChat && <div className="task-footer-actions"><button className="button button-outline button-small" onClick={() => onOpenChat(task)}>{chatReadOnly ? copy.chatReadOnly : copy.chat}</button></div>}
      {user.role !== 'customer' && canReview && <button className="button button-primary button-small" onClick={() => onReview(task)}>{copy.rateRunner}</button>}
      {isCustomerOwner && task.customerRating ? <p className="given-rating">{copy.yourRating}: {'★'.repeat(task.customerRating)}{'☆'.repeat(5 - task.customerRating)}</p> : null}
      {((canCancel && (isAdmin || isCustomerOwner || (isRunner && String(task.runnerId?._id || task.runnerId) === String(user.id)))) || canDeletePost || isAdmin) ?
        <div className="task-footer-actions">
          {canCancel && <button className="text-button text-danger" onClick={() => act('cancel')} disabled={loading}>{copy.cancelTask}</button>}
          {canDeletePost && <button className="text-button text-danger" onClick={() => act('delete')} disabled={loading}>{loading ? copy.deleting : copy.deleteTask}</button>}
          {isAdmin && <button className="text-button" onClick={() => onAdminEdit?.(task)}>{copy.editTask}</button>}
          {isAdmin && <button className="text-button text-danger" onClick={() => onAdminDelete?.(task)}>{copy.deleteForever}</button>}
          {task.status !== 'pending' && <button className="text-button" onClick={() => act('dispute')} disabled={loading}>{copy.reportIssue}</button>}
        </div> : null}
      {task.status === 'completed' && task.disputeStatus !== 'open' && !isAdmin && <button className="text-button" onClick={() => act('dispute')}>{copy.reportIssue}</button>}
      {pickup && delivery && <span className="sr-only">{copy.mapHint}</span>}
    </article>
  );
}

function HomeInner({ language = 'en', setLanguage, setAdminView }) {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const userRef = useRef(user);
  userRef.current = user;

  const isAdmin = ['admin', 'super_admin', 'sub_admin'].includes(user.role);

  useEffect(() => {
    setAdminView?.(isAdmin);
  }, [isAdmin, setAdminView]);

  const { search } = useLocation();
  const focusTaskId = new URLSearchParams(search).get('taskId');
  const isBn = language === 'bn';
  const DashboardRoleIcon = user.role === 'runner' ? Bike : isAdmin ? ShieldCheck : MapPin;
  const statusNames = statusNamesByLanguage[language] || statusNamesByLanguage.en;
  const deliveryStages = deliveryStagesByLanguage[language] || deliveryStagesByLanguage.en;
  const uiText = isBn ? {
    header: {
      runner: 'আপনার পরের পথে',
      admin: 'কমিউনিটি পরিচালনা',
      customer: 'আপনার পাড়ার নেটওয়ার্ক',
      runnerTitle: (name) => `স্বাগতম, ${name}`,
      adminTitle: 'কমিউনিটি ড্যাশবোর্ড',
      customerTitle: (name) => `কী কাজে সাহায্য লাগবে, ${name}?`,
      runnerText: 'কাছাকাছি একটি কাজ নিন, পথে থেকেই বাড়তি উপার্জন করুন।',
      adminText: 'সাম্প্রতিক কাজ ও কমিউনিটির নিরাপত্তা দেখুন।',
      customerText: 'একটি স্থানীয় কাজ পোস্ট করুন, অথবা আপনার চলমান কাজের অবস্থা দেখুন।',
      runnerRole: 'রানার',
      adminRole: 'প্রশাসক',
      customerRole: 'গ্রাহক',
    },
    stats: {
      total: 'মোট কাজ',
      pending: 'অপেক্ষমাণ',
      active: 'চলমান কাজ',
      completed: 'সম্পন্ন কাজ',
      trust: 'বিশ্বাস স্কোর',
      limit: 'কাজের সীমা',
      earnings: 'আজকের আয়',
    },
    panels: {
      weekly: 'সাপ্তাহিক চিত্র',
      progress: 'কাজের অগ্রগতি',
      newTaskKicker: 'কয়েক মিনিটেই তৈরি',
      newTaskTitle: 'নতুন কাজ পোস্ট করুন',
      taskTitle: 'কাজের শিরোনাম',
      taskDescription: 'কাজের বিস্তারিত',
      estimate: 'আনুমানিক বাজেট (টাকা)',
      locationHelp: 'আপনার সঠিক স্থান রানারের কাছে কাজটি পৌঁছাতে সাহায্য করবে।',
      post: 'কাজ পোস্ট করুন',
      posting: 'পোস্ট হচ্ছে...',
      openIssues: 'টি খোলা সমস্যা—নিচের কাজগুলো পর্যালোচনা করুন।',
    },
  } : {
    header: {
      runner: 'Your next stop',
      admin: 'Community management',
      customer: 'Your neighborhood network',
      runnerTitle: (name) => `Welcome, ${name}`,
      adminTitle: 'Community dashboard',
      customerTitle: (name) => `What can I help with, ${name}?`,
      runnerText: 'Pick up a nearby job and earn more while you are on the move.',
      adminText: 'Review recent work and keep the community safe.',
      customerText: 'Post a local task or check the status of your active work.',
      runnerRole: 'Runner',
      adminRole: 'Admin',
      customerRole: 'Customer',
    },
    stats: {
      total: 'Total tasks',
      pending: 'Pending',
      active: 'Active jobs',
      completed: 'Completed',
      trust: 'Trust score',
      limit: 'Task limit',
      earnings: "Today's earnings",
    },
    panels: {
      weekly: 'Weekly view',
      progress: 'Task progress',
      newTaskKicker: 'Ready in minutes',
      newTaskTitle: 'Post a new task',
      taskTitle: 'Task title',
      taskDescription: 'Task details',
      estimate: 'Estimated budget (BDT)',
      locationHelp: 'Your exact location helps the runner reach the task quickly.',
      post: 'Post task',
      posting: 'Posting...',
      openIssues: 'open issues—review the task list below.',
    },
  };
  const taskCardCopy = isBn ? {
    dateLocale: 'bn-BD',
    numberLocale: 'bn-BD',
    pickup: 'পিকআপ',
    delivery: 'ডেলিভারি',
    budget: 'বাজেট',
    customer: 'গ্রাহক',
    runner: 'রানার',
    localCustomer: 'স্থানীয় গ্রাহক',
    notAvailable: 'এখনও পাওয়া যায়নি',
    disputeOpen: 'সমস্যা খোলা',
    progressLabel: 'ডেলিভারির অগ্রগতি',
    secureShare: 'রানারকে নিরাপদে দিন',
    otpText: 'পিকআপ OTP',
    deliveryOtpText: 'ডেলিভারি OTP',
    customerOtp: 'পিকআপের সময় গ্রাহকের OTP',
    otpPlaceHolder: '৪ সংখ্যার OTP',
    verifying: 'যাচাই হচ্ছে...',
    confirmPickup: 'পিকআপ নিশ্চিত',
    orderPicked: 'পার্সেলটি পেয়েছেন? যাত্রা শুরু করলে অবস্থা আপডেট করুন।',
    updating: 'আপডেট হচ্ছে...',
    departed: 'রওনা হয়েছি',
    nearDestination: 'গন্তব্যের কাছাকাছি পৌঁছালে গ্রাহককে জানান।',
    nearby: 'কাছাকাছি পৌঁছেছি',
    deliveryOtpLabel: 'প্রাপকের ডেলিভারি OTP',
    confirmDelivery: 'ডেলিভারি নিশ্চিত',
    resolveIssue: 'সমাধান',
    reasonLabel: 'বিবরণ',
    takeJob: 'কাজটি নিন',
    waiting: 'অপেক্ষা করুন...',
    offer: 'প্রস্তাব',
    minutes: 'মিনিট',
    sendOffer: 'প্রস্তাব দিন',
    sending: 'পাঠানো হচ্ছে...',
    chat: 'চ্যাট',
    chatReadOnly: 'চ্যাট দেখুন',
    cancelTask: 'কাজ বাতিল',
    deleteTask: 'পোস্ট মুছুন',
    deleting: 'মুছছে...',
    reportIssue: 'সমস্যা জানান',
    mapHint: 'পিকআপ ও ডেলিভারি স্থান মানচিত্রে দেখানো হয়েছে।',
    confirmDelete: 'এই কাজের পোস্টটি স্থায়ীভাবে মুছে ফেলবেন?',
    cancelReason: 'ব্যবহারকারীর অনুরোধে বাতিল',
    disputePrompt: 'সমস্যার বিস্তারিত লিখুন (অন্তত ১০ অক্ষর)',
    deleteSuccess: 'আপনার কাজের পোস্টটি মুছে ফেলা হয়েছে।',
    bidSent: 'আপনার প্রস্তাবটি পাঠানো হয়েছে।',
    resolutionPrompt: 'সমাধানের বিবরণ লিখুন',
    faultPrompt: 'দায় কার? রানার হলে ১, গ্রাহক হলে ২, কেউ নয় হলে ০ লিখুন',
    faultDefault: '০',
    invalidFault: 'দায়ের ধরন সঠিকভাবে নির্বাচন করুন',
    noAddress: 'ঠিকানা দেওয়া হয়নি',
    select: 'বাছাই',
    rateRunner: 'রানারকে রেটিং দিন',
    yourRating: 'আপনার রেটিং',
    editTask: 'সম্পাদনা',
    deleteForever: 'স্থায়ী মুছুন',
  } : {
    dateLocale: 'en-US',
    numberLocale: 'en-US',
    pickup: 'Pickup',
    delivery: 'Delivery',
    budget: 'Budget',
    customer: 'Customer',
    runner: 'Runner',
    localCustomer: 'Local customer',
    notAvailable: 'Not assigned yet',
    disputeOpen: 'Issue open',
    progressLabel: 'Delivery progress',
    secureShare: 'Share safely with runner',
    otpText: 'Pickup OTP',
    deliveryOtpText: 'Delivery OTP',
    customerOtp: 'Customer OTP at pickup',
    otpPlaceHolder: '4-digit OTP',
    verifying: 'Verifying...',
    confirmPickup: 'Confirm pickup',
    orderPicked: 'Parcel received? Update the status when you begin the trip.',
    updating: 'Updating...',
    departed: 'Departed',
    nearDestination: 'Let the customer know when you are close to the destination.',
    nearby: 'Nearby',
    deliveryOtpLabel: 'Recipient delivery OTP',
    confirmDelivery: 'Confirm delivery',
    resolveIssue: 'Resolve issue',
    reasonLabel: 'Description',
    takeJob: 'Take this job',
    waiting: 'Please wait...',
    offer: 'Offer',
    minutes: 'Minutes',
    sendOffer: 'Send offer',
    sending: 'Sending...',
    chat: 'Chat',
    chatReadOnly: 'View chat',
    cancelTask: 'Cancel task',
    deleteTask: 'Delete post',
    deleting: 'Deleting...',
    reportIssue: 'Report issue',
    mapHint: 'Pickup and delivery locations are shown on the map.',
    confirmDelete: 'Delete this task permanently?',
    cancelReason: 'Cancelled at customer request',
    disputePrompt: 'Describe the issue (at least 10 characters)',
    deleteSuccess: 'Your task post was deleted.',
    bidSent: 'Your offer was sent successfully.',
    resolutionPrompt: 'Describe the resolution',
    faultPrompt: 'Who is at fault? Enter 1 for runner, 2 for customer, or 0 for none',
    faultDefault: '0',
    invalidFault: 'Select the correct party at fault',
    noAddress: 'Address not provided',
    select: 'Select',
    rateRunner: 'Rate your runner',
    yourRating: 'Your rating',
    editTask: 'Edit',
    deleteForever: 'Delete forever',
  };

  const [dashboard, setDashboard] = useState({ stats: {}, activity: [], recentTasks: [] });
  const [tasks, setTasks] = useState([]);
  const groupedTasks = useMemo(() => groupTasks(tasks), [tasks]);
  const [, setNearbyTasks] = useState([]);
  const [marketSearch, setMarketSearch] = useState('');
  const [marketLocation, setMarketLocation] = useState('');
  const [runnerPosition, setRunnerPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [bids, setBids] = useState({});
  const [adminUsers, setAdminUsers] = useState([]);
  const [chatTask, setChatTask] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [reviewTask, setReviewTask] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', estimatedPrice: '', pickupAddress: '', deliveryAddress: '', status: 'pending' });
  const [confirmAction, setConfirmAction] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', estimatedPrice: '',
    pickupAddress: '', pickupPosition: null,
    deliveryAddress: '', deliveryPosition: null,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: '', email: '', phone: '', area: '', currentPassword: '', newPassword: '', confirmNewPassword: '', avatarUrl: '' });
  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState('');
  const [customerTab, setCustomerTab] = useState('all');
  const [runnerTab, setRunnerTab] = useState('open');
  const [runnerOtpInput, setRunnerOtpInput] = useState('');
  const [otpConfirming, setOtpConfirming] = useState(false);
  const [confirmingStatus, setConfirmingStatus] = useState(null);
  const [acceptingBidId, setAcceptingBidId] = useState(null);

  // Recent activity: last 4 events across recent tasks
  const recentActivity = useMemo(() => {
    if (user.role !== 'customer') return [];
    const events = [];
    const ordered = [...(dashboard.recentTasks || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    for (const task of ordered) {
      events.push({ id: `posted-${task._id}`, time: task.createdAt, icon: 'task', text: task.title, status: task.status, runner: task.runnerId });
      if (task.runnerId && task.status !== 'pending') {
        events.push({ id: `accepted-${task._id}`, time: task.updatedAt || task.createdAt, icon: 'user', text: task.runnerId?.name || 'Runner', status: task.status, runner: task.runnerId });
      }
      if (task.status === 'completed') {
        events.push({ id: `completed-${task._id}`, time: task.completedAt || task.createdAt, icon: 'check', text: task.title, status: task.status, runner: task.runnerId });
      }
    }
    return events.slice(0, 4);
  }, [dashboard.recentTasks, user.role]);

  const updateSettings = async (event) => {
    event.preventDefault();
    setSettingsNotice('');
    if (!settingsForm.currentPassword || !settingsForm.newPassword || !settingsForm.confirmNewPassword) {
      setSettingsNotice(isBn ? 'সব খাতা পূরণ করুন।' : 'Fill in all fields.');
      return;
    }
    if (settingsForm.newPassword !== settingsForm.confirmNewPassword) {
      setSettingsNotice(isBn ? 'নতুন পাসওয়ার্ড মিলছে না।' : 'New passwords do not match.');
      return;
    }
    if (settingsForm.newPassword.length < 8) {
      setSettingsNotice(isBn ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।' : 'Password must be at least 8 characters.');
      return;
    }
    setSettingsBusy(true);
    try {
      await api.updatePassword({ currentPassword: settingsForm.currentPassword, newPassword: settingsForm.newPassword });
      setSettingsNotice(isBn ? 'পাসওয়ার্ড আপডেট করা হয়েছে।' : 'Password updated successfully.');
      setSettingsForm((current) => ({ ...current, currentPassword: '', newPassword: '', confirmNewPassword: '' }));
    } catch (error) {
      setSettingsNotice(error.message || (isBn ? 'পাসওয়ার্ড আপডেটে সমস্যা।' : 'Could not update password.'));
    } finally {
      setSettingsBusy(false);
    }
  };

  const handleLogout = async () => {
    setNotice('');
    try {
      await api.logout();
      logout();
      navigate('/login');
    } catch (error) {
      setNotice(error.message || (isBn ? 'লগআউটে সমস্যা।' : 'Could not log out.'));
    }
  };

  const saveProfile = async () => {
    setSettingsNotice('');
    setSettingsBusy(true);
    try {
      const formData = new FormData();
      formData.append('name', settingsForm.name);
      formData.append('email', settingsForm.email);
      formData.append('phone', settingsForm.phone);
      formData.append('area', settingsForm.area);
      if (newAvatarFile) formData.append('avatar', newAvatarFile);
      await api.updateProfile(formData);
      setSettingsNotice(isBn ? 'প্রোফাইল সংরক্ষণ করা হয়েছে।' : 'Profile saved successfully.');
      await refreshUser();
    } catch (error) {
      setSettingsNotice(error.message || (isBn ? 'প্রোফাইল সংরক্ষণে সমস্যা।' : 'Could not save profile.'));
    } finally {
      setSettingsBusy(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'current') setShowCurrentPassword((prev) => !prev);
    if (field === 'new') setShowNewPassword((prev) => !prev);
    if (field === 'confirm') setShowConfirmPassword((prev) => !prev);
  };

  const openSettings = () => {
    setSettingsForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      area: user?.area || '',
      avatarUrl: user?.avatarUrl || '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });
    setNewAvatarFile(null);
    setSettingsNotice('');
    setSettingsOpen(true);
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setSettingsNotice(isBn ? 'শুধু JPG, PNG, বা WebP ছবি অনুমোদিত।' : 'Only JPG, PNG, or WebP images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSettingsNotice(isBn ? 'ছবি ২ মিবির চেয়ে ছোট হতে হবে।' : 'Image must be smaller than 2 MB.');
      return;
    }
    setNewAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setSettingsForm({ ...settingsForm, avatarUrl: previewUrl });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setNotice('');
    let errors = 0;
    const errorMessages = [];
    try {
      const dashboardData = await api.dashboard();
      setDashboard(dashboardData);
    } catch (e) { errors++; errorMessages.push('Dashboard: ' + e.message); console.error('Dashboard load failed:', e.message); }
    try {
      const taskData = await api.tasks();
      setTasks(taskData.tasks);
    } catch (e) { errors++; errorMessages.push('Tasks: ' + e.message); console.error('Tasks load failed:', e.message); }
    try {
      await refreshUser();
    } catch (e) { errors++; errorMessages.push('User: ' + e.message); console.error('User refresh failed:', e.message); }
    if (userRef.current && ['admin', 'super_admin', 'sub_admin'].includes(userRef.current.role)) {
      try {
        const userData = await api.adminUsers();
        setAdminUsers(userData.users);
      } catch (e) {
        setAdminUsers([]);
        console.error('Admin users load failed:', e.message);
      }
    }
    if (errors > 0) {
      setNotice(errorMessages.join(' | ') + '. Click Refresh to retry.');
    }
    setLoading(false);
  }, [refreshUser]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (user.role !== 'customer') return;
    const fresh = tasks.find((task) => ['completed', 'delivered'].includes(task.status) && task.runnerId && !task.customerRating);
    if (!fresh) return;
    const key = `locomuv:reviewPrompt:${fresh._id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    setReviewTask(fresh);
  }, [tasks, user.role]);

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      try {
        const [dashboardData, taskData] = await Promise.all([
          api.dashboard(),
          api.tasks(),
        ]);
        setDashboard(dashboardData);
        setTasks(taskData.tasks);
      } catch (error) {
        setNotice(error.message);
      }
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Deduplicate tasks by id (in case same task comes from multiple sources)
  const uniqueTasks = Array.from(new Map(tasks.map((t) => [t._id, t])).values());

  // Status-based filtered arrays (single source of truth)
  const activeTasks = uniqueTasks.filter((t) => ACTIVE_STATUSES.includes(t.status));
  const completedTasks = uniqueTasks.filter((t) => DONE_STATUSES.includes(t.status));
  const openJobs = uniqueTasks.filter((t) => t.status === 'pending' && !t.runnerId);

  // Auto-select the most recent active task for customers and runners
  useEffect(() => {
    if (user.role === 'customer') {
      const nonCompleted = activeTasks.filter((t) => !['completed', 'cancelled', 'deleted'].includes(t.status));
      if (nonCompleted.length > 0 && !selectedTaskId) {
        setSelectedTaskId(nonCompleted[0]._id);
      }
    }
    if (user.role === 'runner') {
      const runnerTasks = activeTasks.filter((t) => String(t.runnerId?._id || t.runnerId) === String(user.id));
      if (runnerTasks.length > 0 && !selectedTaskId) {
        setSelectedTaskId(runnerTasks[0]._id);
      }
    }
  }, [activeTasks, selectedTaskId, user.role]);

  // Load runner offers for the selected pending task immediately, then every 10 seconds
  useEffect(() => {
    if (user.role !== 'customer' || !selectedTaskId) return undefined;
    const task = tasks.find((t) => String(t._id) === String(selectedTaskId));
    if (!task || task.status !== 'pending') return undefined;
    let active = true;
    const fetchBids = async () => {
      try {
        const result = await api.bids(selectedTaskId);
        if (active) setBids((current) => ({ ...current, [selectedTaskId]: result.bids }));
      } catch (error) {
        // ignore bid polling errors
      }
    };
    fetchBids();
    const intervalId = window.setInterval(fetchBids, 10000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [selectedTaskId, tasks, user.role]);

  const refreshNearby = useCallback(async (position = runnerPosition) => {
    if (!position || user.role !== 'runner') return;
    try {
      const result = await api.nearby(position[0], position[1]);
      setNearbyTasks(result.tasks);
    } catch (error) {
      setNotice(error.message);
    }
  }, [runnerPosition, user.role]);

  const locateRunner = () => {
    if (!navigator.geolocation) {
      setRunnerPosition(dhaka);
      refreshNearby(dhaka);
      setNotice(isBn ? 'ঢাকার অবস্থান ডিফল্ট হিসেবে ব্যবহৃত হচ্ছে।' : 'Using Dhaka location as default.');
      return;
    }
    setLocationLoading(true);
    setNotice('');
    navigator.geolocation.getCurrentPosition(async ({ coords: point }) => {
      const position = [point.latitude, point.longitude];
      setRunnerPosition(position);
      await refreshNearby(position);
      setLocationLoading(false);
    }, () => {
      setRunnerPosition(dhaka);
      refreshNearby(dhaka);
      setNotice(isBn ? 'অবস্থান অনুমতি না পাওয়ায় ঢাকার অবস্থান ব্যবহৃত হচ্ছে।' : 'Using Dhaka location as default.');
      setLocationLoading(false);
    }, { enableHighAccuracy: true, timeout: 8000 });
  };

  const visibleTasks = useMemo(() => {
    const list = tasks || [];
    if (user.role === 'runner') {
      const keyword = marketSearch.trim().toLowerCase();
      const location = marketLocation.trim().toLowerCase();
      return list.filter((task) => {
        // Open jobs only: pending status with no assigned runner
        if (task.status !== 'pending' || task.runnerId) return false;
        const haystack = [
          task.title,
          task.description,
          task.pickupAddress,
          task.deliveryAddress,
          task.customerId?.name,
        ].filter(Boolean).join(' ').toLowerCase();
        const matchesKeyword = !keyword || haystack.includes(keyword);
        const matchesLocation = !location || [task.pickupAddress, task.deliveryAddress, task.customerId?.name].some((value) => String(value || '').toLowerCase().includes(location));
        return matchesKeyword && matchesLocation;
      });
    }
    if (user.role === 'customer' && customerTab !== 'all') {
      return list.filter((task) => task.status === customerTab);
    }
    return list;
  }, [tasks, user.role, marketSearch, marketLocation, customerTab]);

  useEffect(() => {
    const taskCard = document.getElementById(`task-card-${focusTaskId}`);
    if (!taskCard) return undefined;
    taskCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    taskCard.classList.add('task-card-focus');
    const timeoutId = window.setTimeout(() => taskCard.classList.remove('task-card-focus'), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [focusTaskId, loading, visibleTasks.length]);

  const openDisputes = tasks.filter((task) => task.disputeStatus === 'open');

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const refreshAll = async () => {
    await load();
    if (user.role === 'runner') await refreshNearby();
  };

  const actCancel = async (task) => {
    setLoading(true);
    try {
      await api.cancelTask(task._id, isBn ? 'কাজ বাতিল করা হয়েছে' : 'Cancelled at customer request');
      setLoading(false);
      await load();
    } catch (error) {
      setLoading(false);
      setNotice(error.message || 'Could not cancel task.');
    }
  };

  const actDispute = async (task) => {
    const resolution = window.prompt(isBn ? 'সমস্যাটি লিখুন' : 'Describe the issue');
    if (!resolution) return;
    try {
      await api.reportDispute(task._id, resolution);
      await load();
    } catch (error) {
      setNotice(error.message || 'Could not report issue.');
    }
  };

  const toggleTaskSelect = (id) =>
    setSelectedTaskIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );

  const openEditTask = (task) => {
    setEditTask(task);
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      estimatedPrice: task.estimatedPrice || '',
      pickupAddress: task.pickupAddress || '',
      deliveryAddress: task.deliveryAddress || '',
      status: task.status || 'pending',
    });
  };

  const saveEditTask = async (event) => {
    event.preventDefault();
    if (!editTask) return;
    try {
      await api.adminUpdateTask(editTask._id, { ...editForm, estimatedPrice: Number(editForm.estimatedPrice) });
      setEditTask(null);
      await load();
    } catch (error) {
      setNotice(error.message || 'Could not update task.');
    }
  };

  const chooseBid = async (bidId) => {
    if (!selectedTaskId) return;
    try {
      setAcceptingBidId(bidId);
      await api.acceptBid(selectedTaskId, bidId);
      await load();
    } catch (error) {
      setNotice(error.message || 'Could not accept bid.');
    } finally {
      setAcceptingBidId(null);
    }
  };

  const confirmRunnerOtp = async (taskId, otpType) => {
    if (otpConfirming) return;
    try {
      setOtpConfirming(true);
      if (otpType === 'pickup') {
        await api.verifyPickup(taskId, runnerOtpInput);
      } else {
        await api.verifyDelivery(taskId, runnerOtpInput);
      }
      setRunnerOtpInput('');
      setOtpConfirming(false);
      await load();
    } catch (error) {
      setOtpConfirming(false);
      setNotice(error.message || 'OTP verification failed.');
    }
  };

  const updateRunnerStatus = async (taskId, newStatus) => {
    if (confirmingStatus) return;
    try {
      setConfirmingStatus(newStatus);
      await api.updateDeliveryStatus(taskId, newStatus);
      await load();
    } catch (error) {
      setConfirmingStatus(null);
      setNotice(error.message || 'Status update failed.');
    }
  };

  const submitTask = async (event) => {
    event.preventDefault();
    if (!form.pickupPosition || !form.deliveryPosition) {
      setNotice(isBn ? 'কাজ পোস্ট করার আগে পিকআপ ও ডেলিভারির স্থান মানচিত্রে বাছাই করুন।' : 'Please select pickup and delivery locations on the map before posting.');
      return;
    }
    setSubmitting(true);
    setNotice('');
    try {
      const created = await api.createTask({
        title: form.title,
        description: form.description,
        estimatedPrice: Number(form.estimatedPrice),
        pickupLocation: {
          address: form.pickupAddress,
          latitude: form.pickupPosition[0],
          longitude: form.pickupPosition[1],
        },
        deliveryLocation: {
          address: form.deliveryAddress,
          latitude: form.deliveryPosition[0],
          longitude: form.deliveryPosition[1],
        },
      });
      setForm({
        title: '', description: '', estimatedPrice: '',
        pickupAddress: '', pickupPosition: null,
        deliveryAddress: '', deliveryPosition: null,
      });
      setNotice(isBn ? 'আপনার কাজটি পোস্ট হয়েছে। কাছের রানাররা এখন এটি দেখতে পারবেন।' : 'Your task has been posted. Nearby runners can now see it.');
      await load();
      // Auto-select the newly created task in Active task panel
      if (created && created._id) {
        setSelectedTaskId(created._id);
      }
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToPostForm = () => {
    const el = document.getElementById('post-task-form');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Render the active task panel for the selected customer task
  function renderActiveTaskPanel(taskId) {
    const task = tasks.find((t) => String(t._id) === String(taskId));
    if (!task) return null;
    const bidList = bids[task._id] || [];
    const status = task.status;
    const isCustomer = user.role === 'customer';
    const isRunner = user.role === 'runner';

    const statusOrder = ['pending', 'accepted', 'picked-up', 'in-transit', 'arriving', 'completed'];
    const stageIndex = statusOrder.indexOf(status);
    const stepLabels = {
      posted: { en: 'Posted', bn: 'পোস্ট করা হয়েছে' },
      accepted: { en: 'Assigned', bn: 'রানার পাওয়া গেছে' },
      'picked-up': { en: 'Picked up', bn: 'পিকআপ সফল' },
      'in-transit': { en: 'Departed', bn: 'রওনা হয়েছে' },
      arriving: { en: 'Nearby', bn: 'কাছাকাছি' },
      completed: { en: 'Delivered', bn: 'ডেলিভারি সম্পন্ন' },
    };
    const stepHelper = {
      pending: { en: 'Waiting for a runner to accept your task.', bn: 'কাজ রানার গ্রহণ করার অপেক্ষায়।' },
      accepted: { en: 'Runner has accepted your task.', bn: 'রানার আপনার কাজ গ্রহণ করেছেন।' },
      'picked-up': { en: 'Runner has picked up your parcel.', bn: 'রানার আপনার পার্সেল নেয়ায়।' },
      'in-transit': { en: 'Runner is on the way to delivery.', bn: 'রানার ডেলিভারির পথে আছে।' },
      arriving: { en: 'Runner is near the destination.', bn: 'রানার গন্তব্যের কাছাকাছি পৌঁছাচ্ছেন।' },
      completed: { en: 'Task completed successfully.', bn: 'কাজ সফলভাবে সম্পন্ন হয়েছে।' },
    };

    const truncatedAddress = (addr) => {
      if (!addr) return isBn ? 'ঠিকানা নেই' : 'No address';
      return addr.length > 38 ? addr.slice(0, 38) + '…' : addr;
    };

    const openInMaps = (addr) => {
      if (!addr) return;
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank');
    };

    return (
      <>
        {/* Task switcher - only show if multiple active tasks */}
        <div className="active-task-switcher">
          <span className="switcher-label">{isBn ? 'কাজ বাছাই করুন' : 'Select task'}</span>
          <div className="switcher-tabs">
            {tasks
              .filter((t) => !['completed', 'cancelled', 'deleted'].includes(t.status))
              .map((t) => (
                <button
                  key={t._id}
                  type="button"
                  className={`switcher-tab ${selectedTaskId === String(t._id) ? 'switcher-tab-active' : ''}`}
                  onClick={() => setSelectedTaskId(String(t._id))}
                  aria-label={t.title}
                >
                  {t.title}
                </button>
              ))}
          </div>
        </div>

        {/* Empty state */}
        {!selectedTaskId && (
          <div className="active-task-empty">
            <span className="empty-icon">📭</span>
            <h3>{isBn ? 'কাজ বেছে নিন' : 'No active task selected'}</h3>
            <p>{isBn ? 'উপরের তালিকা থেকে একটি কাজ বেছে নিন।' : 'Select a task above to track it.'}</p>
            {isCustomer && <button className="button button-primary" onClick={scrollToPostForm}>{isBn ? 'কাজ পোস্ট করুন' : 'Post a task'}</button>}
          </div>
        )}

        {/* Active task content */}
        {selectedTaskId && (
          <>
            {/* Header */}
            <div className="active-task-header">
              <div>
                <h3 className="active-task-title">{task.title}</h3>
                <span className={`badge badge-status status-${status}`}>{statusNames[status] || status}</span>
              </div>
              {isRunner && (
                <button className="button button-outline button-small refresh-btn" onClick={() => load()} aria-label="Refresh">
                  ↻
                </button>
              )}
            </div>

            {/* Budget */}
            <div className="active-task-budget">
              <span className="budget-label">{isBn ? 'বাজেট' : 'Budget'}</span>
              <span className="budget-value">{money(task.finalPrice ?? task.estimatedPrice)}</span>
            </div>

            {/* Stage-specific content */}
            {/* Stage 1: Pending - Customer offers */}
            {isCustomer && status === 'pending' && (
              <>
                <div className="offers-section">
                  <h4 className="offers-title">{isBn ? 'রানারদের প্রস্তাব' : 'Runner offers'}</h4>
                  {bidList.length === 0 && (
                    <div className="offers-empty">
                      <div className="offers-pulse">●</div>
                      <p>{isBn ? 'প্রস্তাবের অপেক্ষায়...' : 'Waiting for offers...'}</p>
                    </div>
                  )}
                  {bidList.length > 0 && (
                    <div className="offers-list">
                      {bidList.filter((bid) => bid.status !== 'rejected').map((bid) => (
                        <div key={bid._id} className="offer-item">
                          <div className="offer-avatar">{bid.runnerId?.name?.slice(0, 1) || 'R'}</div>
                          <div className="offer-info">
                            <div className="offer-name">{bid.runnerId?.name || 'Runner'}</div>
                            <div className="offer-rating"><span className="rating-star">★</span> {Number(bid.runnerId?.trustScore || 0).toFixed(1)}</div>
                            <div className="offer-details">{bid.deliveryTime} {isBn ? 'মিনিট' : 'mins'}</div>
                          </div>
                          <div className="offer-price">{money(bid.proposedPrice)}</div>
                            <div className="offer-actions">
                                <button type="button" className="button button-outline button-small" onClick={() => chooseBid(bid._id)} disabled={acceptingBidId === bid._id}>{acceptingBidId === bid._id ? (isBn ? 'গ্রহণ হচ্ছে...' : 'Accepting...') : (isBn ? 'গ্রহণ' : 'Accept')}</button>
                                <button type="button" className="button button-outline button-small" onClick={() => setBids((c) => ({ ...c, [task._id]: bidList.map((b) => (b._id === bid._id ? { ...b, status: 'rejected' } : b)) }))}>{isBn ? 'প্রত্যাখ্যান' : 'Decline'}</button>
                              </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="stage-helper">{isBn ? stepHelper.pending.bn : stepHelper.pending.en}</div>
              </>
            )}

            {/* Stage 2+: Has runner */}
            {task.runnerId && (
              <>
                {/* Customer: runner card */}
                {isCustomer && (
                  <div className="runner-info-card">
                    <div className="runner-avatar-wrap">
                      {task.runnerId.avatarUrl ? (
                        <img src={task.runnerId.avatarUrl} alt="Runner" className="runner-avatar-img" />
                      ) : (
                        <span className="runner-avatar-empty">{task.runnerId.name?.slice(0, 1).toUpperCase() || 'R'}</span>
                      )}
                    </div>
                    <div className="runner-info-text">
                      <span className="runner-name">{task.runnerId.name}</span>
                      <span className="runner-rating"><span className="rating-star">★</span> {Number(task.runnerId.avgRating || 0).toFixed(1)}</span>
                    </div>
                    <div className="runner-actions">
                      <button type="button" className="button button-outline button-small" onClick={() => { setChatTask(task); setChatOpen(true); }} aria-label="Chat">
                        <span>💬</span> {isBn ? 'চ্যাট' : 'Chat'}
                      </button>
                      <button type="button" className="button button-outline button-small" onClick={() => { if (task.runnerId.phone) window.open(`tel:${task.runnerId.phone}`, '_blank'); }} aria-label="Call">
                        <span>📞</span> {isBn ? 'কল' : 'Call'}
                      </button>
                    </div>
                  </div>
                )}
                {/* Runner: customer card */}
                {isRunner && (
                  <div className="customer-info-card">
                    <div className="customer-avatar-wrap">
                      {task.customerId?.avatarUrl ? (
                        <img src={task.customerId.avatarUrl} alt="Customer" className="customer-avatar-img" />
                      ) : (
                        <span className="customer-avatar-empty">{task.customerId?.name?.slice(0, 1).toUpperCase() || 'C'}</span>
                      )}
                    </div>
                    <div className="customer-info-text">
                      <span className="customer-name">{task.customerId?.name || 'Customer'}</span>
                      <span className="customer-role">{isBn ? 'গ্রাহক' : 'Customer'}</span>
                    </div>
                    <div className="customer-actions">
                      <button type="button" className="button button-outline button-small" onClick={() => { setChatTask(task); setChatOpen(true); }} aria-label="Chat">
                        <span>💬</span> {isBn ? 'চ্যাট' : 'Chat'}
                      </button>
                      <button type="button" className="button button-outline button-small" onClick={() => { if (task.customerId?.phone) window.open(`tel:${task.customerId.phone}`, '_blank'); }} aria-label="Call">
                        <span>📞</span> {isBn ? 'কল' : 'Call'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Route timeline */}
                <div className="route-timeline">
                  <div className="route-row">
                    <span className="route-dot route-start"></span>
                    <div className="route-content">
                      <span className="route-label">{isBn ? 'পিকআপ' : 'Pickup'}</span>
                      <div className="route-address" onClick={() => openInMaps(task.pickupAddress)} onMouseEnter={(e) => { e.currentTarget.title = task.pickupAddress || ''; }} onMouseLeave={(e) => { e.currentTarget.title = ''; }}>
                        {task.pickupAddress || (isBn ? 'ঠিকানা দেওয়া হয়নি' : 'Address not provided')}
                      </div>
                    </div>
                    <span className="route-line"></span>
                  </div>
                  <div className="route-row">
                    <span className="route-dot route-end"></span>
                    <div className="route-content">
                      <span className="route-label">{isBn ? 'ডেলিভারি' : 'Delivery'}</span>
                      <div className="route-address" onClick={() => openInMaps(task.deliveryAddress)} onMouseEnter={(e) => { e.currentTarget.title = task.deliveryAddress || ''; }} onMouseLeave={(e) => { e.currentTarget.title = ''; }}>
                        {task.deliveryAddress || (isBn ? 'ঠিকানা দেওয়া হয়নি' : 'Address not provided')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status stepper */}
                {status !== 'pending' && (
                  <div className="stepper-section">
                    <ol className="step-tracker">
                      {[statusOrder[1], 'picked-up', 'in-transit', 'arriving', 'completed'].map((key, idx) => {
                        const complete = stageIndex >= idx + 1;
                        const current = stageIndex === idx + 1;
                        return (
                          <li key={key} className={`step-item ${complete ? 'step-complete' : ''} ${current ? 'step-current' : ''}`}>
                            <span className="step-marker">{current ? '●' : complete ? '✓' : idx + 2}</span>
                            <span className="step-label">{stepLabels[key][isBn ? 'bn' : 'en']}</span>
                          </li>
                        );
                      })}
                    </ol>
                    <div className="stage-helper">{isBn ? stepHelper[status].bn : stepHelper[status].en}</div>
                  </div>
                )}

                {/* OTP section - Customer only */}
                {isCustomer && task.runnerId && status !== 'completed' && (
                  <div className="otp-section">
                    {status === 'accepted' && task.pickupOTP && (
                      <>
                        <div className="otp-row">
                          <span className="otp-label">{isBn ? 'পিকআপ OTP' : 'Pickup OTP'}</span>
                          <div className="otp-boxes">
                            {String(task.pickupOTP).split('').map((digit, i) => (
                              <span key={i} className="otp-box">{digit}</span>
                            ))}
                          </div>
                          <button type="button" className="button button-outline button-small otp-copy" onClick={() => {
                            navigator.clipboard.writeText(String(task.pickupOTP));
                            setNotice(isBn ? 'পিকআপ OTP কপি করা হয়েছে' : 'Pickup OTP copied');
                          }} aria-label="Copy OTP">
                            📋
                          </button>
                        </div>
                        <p className="otp-hint">{isBn ? 'শুধু পিকআপের সময় রানারকে এই OTP দিন।' : 'Share this OTP with the runner only at pickup.'}</p>
                      </>
                    )}
                    {status !== 'pending' && status !== 'completed' && task.deliveryOTP && (
                      <>
                        <div className="otp-row">
                          <span className="otp-label">{isBn ? 'ডেলিভারি OTP' : 'Delivery OTP'}</span>
                          <div className="otp-boxes">
                            {String(task.deliveryOTP).split('').map((digit, i) => (
                              <span key={i} className="otp-box">{digit}</span>
                            ))}
                          </div>
                          <button type="button" className="button button-outline button-small otp-copy" onClick={() => {
                            navigator.clipboard.writeText(String(task.deliveryOTP));
                            setNotice(isBn ? 'ডেলিভারি OTP কপি করা হয়েছে' : 'Delivery OTP copied');
                          }} aria-label="Copy OTP">
                            📋
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Runner OTP input */}
                {isRunner && task.runnerId === undefined && false && null}
                {isRunner && (
                  <>
                    {status === 'accepted' && (
                      <div className="runner-otp-input">
                        <label className="otp-input-label">{isBn ? 'পিকআপ OTP確認' : 'Confirm Pickup OTP'}</label>
                        <input
                          type="text"
                          maxLength="4"
                          inputMode="numeric"
                          value={runnerOtpInput}
                          onChange={(e) => setRunnerOtpInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="____"
                          className="otp-input"
                          disabled={otpConfirming}
                        />
                        <button
                          type="button"
                          className={`button button-primary button-small ${otpConfirming ? 'otp-confirming' : ''}`}
                          onClick={() => confirmRunnerOtp(task._id, 'pickup')}
                          disabled={otpConfirming || runnerOtpInput.length !== 4}
                          aria-label="Confirm pickup OTP"
                        >
                          {otpConfirming ? (isBn ? 'যাচাই হচ্ছে...' : 'Verifying...') : (isBn ? 'নিশ্চিত করুন' : 'Confirm')}
                        </button>
                      </div>
                    )}
                    {status === 'picked-up' && (
                      <button
                        type="button"
                        className={`button button-primary ${confirmingStatus === 'in-transit' ? 'status-confirming' : ''}`}
                        onClick={() => updateRunnerStatus(task._id, 'in-transit')}
                        disabled={confirmingStatus === 'in-transit'}
                        aria-label="Mark departed"
                      >
                        {confirmingStatus === 'in-transit' ? (isBn ? 'হচ্ছে...' : 'Updating...') : (isBn ? 'রওনা করুন' : 'Mark departed')}
                      </button>
                    )}
                    {status === 'in-transit' && (
                      <button
                        type="button"
                        className={`button button-primary ${confirmingStatus === 'arriving' ? 'status-confirming' : ''}`}
                        onClick={() => updateRunnerStatus(task._id, 'arriving')}
                        disabled={confirmingStatus === 'arriving'}
                        aria-label="Mark nearby"
                      >
                        {confirmingStatus === 'arriving' ? (isBn ? 'হচ্ছে...' : 'Updating...') : (isBn ? 'কাছাকাছি পৌঁছানো' : 'Mark nearby')}
                      </button>
                    )}
                    {status === 'arriving' && (
                      <div className="runner-otp-input">
                        <label className="otp-input-label">{isBn ? 'ডেলিভারি OTP' : 'Confirm Delivery OTP'}</label>
                        <input
                          type="text"
                          maxLength="4"
                          inputMode="numeric"
                          value={runnerOtpInput}
                          onChange={(e) => setRunnerOtpInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="____"
                          className="otp-input"
                          disabled={otpConfirming}
                        />
                        <button
                          type="button"
                          className={`button button-primary ${otpConfirming ? 'otp-confirming' : ''}`}
                          onClick={() => confirmRunnerOtp(task._id, 'delivery')}
                          disabled={otpConfirming || runnerOtpInput.length !== 4}
                          aria-label="Confirm delivery OTP"
                        >
                          {otpConfirming ? (isBn ? 'যাচাই হচ্ছে...' : 'Verifying...') : (isBn ? 'নিশ্চিত করুন' : 'Confirm delivery')}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Actions */}
            <div className="active-task-actions">
              {['pending', 'accepted'].includes(status) && (
                <button
                  type="button"
                  className="button button-outline button-small text-danger cancel-btn"
                  onClick={() => actCancel(task)}
                  aria-label="Cancel task"
                >
                  {isBn ? 'কাজ বাতিল' : 'Cancel task'}
                </button>
              )}
              <button type="button" className="button button-outline button-small report-btn" onClick={() => actDispute(task)} aria-label="Report issue">
                {isBn ? 'সমস্যা জানান' : 'Report issue'}
              </button>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="dashboard-page page-width">
      {isAdmin && <AdminControlPanel language={language} setLanguage={setLanguage} user={user} users={adminUsers} tasks={tasks} onNotice={setNotice} onUsersChange={load} />}
      {!isAdmin && (
        <>
          <section className="dashboard-welcome">
            <div className="dashboard-welcome-copy">
              <div className="dashboard-welcome-topline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div className={`eyebrow dashboard-role-eyebrow role-${user.role}`}>
                  <span className="dashboard-role-icon"><DashboardRoleIcon size={14} strokeWidth={2.4} /></span>
                  <span className="dashboard-role-label">{user.role === 'runner' ? uiText.header.runner : uiText.header.customer}</span>
                </div>
                <button type="button" className="language-switch" onClick={() => setLanguage?.((current) => (current === 'en' ? 'bn' : 'en'))} aria-label="Toggle language" title={language === 'en' ? 'বাংলা' : 'English'}>
                  <Globe2 size={15} />
                  <span>{language === 'en' ? 'EN / বাংলা' : 'বাংলা / EN'}</span>
                </button>
                <Link to="/" className="dashboard-home-btn" title={isBn ? 'হোম পেজে যান' : 'Go to home page'} aria-label={isBn ? 'হোম পেজে যান' : 'Go to home page'}>
                  <HomeIcon size={14} />
                  <span>{isBn ? 'হোম' : 'Home'}</span>
                </Link>
                <button type="button" className="button button-outline button-small dashboard-settings-btn" onClick={openSettings} aria-label={isBn ? 'সেটিংস' : 'Settings'} title={isBn ? 'সেটিংস' : 'Settings'}>
                  <Settings size={14} />
                  <span>{isBn ? 'সেটিংস' : 'Settings'}</span>
                </button>
                <button type="button" className="button button-outline button-small dashboard-logout-btn" onClick={handleLogout} aria-label={isBn ? 'লগআউট' : 'Logout'} title={isBn ? 'লগআউট' : 'Logout'}>{isBn ? 'লগআউট' : 'Logout'}</button>
              </div>
              <h1>{user.role === 'runner' ? uiText.header.runnerTitle(user.name.split(' ')[0]) : uiText.header.customerTitle(user.name.split(' ')[0])}</h1>
              <p>{user.role === 'runner' ? uiText.header.runnerText : uiText.header.customerText}</p>
              <div className="profile-chip">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="profile-avatar-img" />
                ) : (
                  <span className="profile-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                )}
                <div>
                  <b>{user.name}</b>
                  <small>{user.role === 'runner' ? uiText.header.runnerRole : uiText.header.customerRole}</small>
                  {user.area && <span className="profile-area-tag"> · 📍 {user.area}</span>}
                </div>
              </div>
            </div>

            <div className="dashboard-visual" aria-label="Local service workflow image">
              <img
                src="https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=900&q=80"
                alt="Runner delivering a parcel in a city neighborhood"
              />
              <div className="dashboard-visual-badge">
                <span className="online-dot" />
                <div>
                  <strong>{isBn ? 'সক্রিয় লোকেশন' : 'Live nearby'}</strong>
                  <small>{isBn ? '২৪ মিনিট আগে' : '24 mins ago'}</small>
                </div>
              </div>
            </div>
          </section>

          <section className="stats-grid dashboard-stats">
            <StatCard icon="▣" label={uiText.stats.total} value={groupedTasks.all.length} language={language} />
            <StatCard icon="◷" label={uiText.stats.pending} value={groupedTasks.pending.length} tone="stat-amber" language={language} />
            <StatCard icon="⌁" label={uiText.stats.active} value={groupedTasks.active.length} tone="stat-blue" language={language} />
            <StatCard icon="✓" label={uiText.stats.completed} value={groupedTasks.completed.length} tone="stat-green" language={language} />
            {user.role === 'runner' && <StatCard icon="✦" label={uiText.stats.trust} value={user.trustScore || 0} tone="stat-green" language={language} />}
            {user.role === 'runner' && <StatCard icon="৳" label={uiText.stats.limit} value={money(user.runnerLimit || 0)} tone="stat-blue" language={language} />}
            {user.role === 'runner' && <StatCard icon="💰" label={uiText.stats.earnings} value={money(user.todayEarnings || 0)} tone="stat-green" language={language} />}
          </section>

          {notice && <div className={notice.includes('পোস্ট হয়েছে') || notice.includes('পাঠানো হয়েছে') || notice.includes('posted') || notice.includes('sent') ? 'notice notice-success' : 'notice'} role="status">{notice}<button onClick={() => setNotice('')} aria-label="Close message">×</button></div>}

          <section className="dashboard-grid dashboard-grid-customer">
            {/* Left column: Chart + Recent activity */}
            <section className="panel-column-left">
              <section className="panel activity-panel">
                <div className="panel-heading"><div><span className="panel-kicker">{uiText.panels.weekly}</span><h2>{uiText.panels.progress}</h2></div><span className="panel-icon">↗</span></div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.activity || []} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
                      <CartesianGrid stroke="#38BDF8" vertical={false} strokeDasharray="3 5" opacity={0.3} />
                      <XAxis dataKey="date" tickFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short' })} tickLine={false} axisLine={false} tick={{ fill: '#38BDF8', fontSize: 11 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#38BDF8', fontSize: 11 }} />
                      <Tooltip labelFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')} formatter={(value) => [isBn ? `${value}টি` : `${value} tasks`, isBn ? 'কাজ' : 'Tasks']} />
                      <Bar dataKey="count" fill="#38BDF8" radius={[6, 6, 0, 0]} maxBarSize={38} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="panel recent-activity-panel">
                <div className="panel-heading"><div><span className="panel-kicker">{isBn ? 'সাম্প্রতিক কার্যক্রম' : 'Recent activity'}</span><h2>{isBn ? 'কার্যক্রম ইতিহাস' : 'Recent activity'}</h2></div></div>
                <div className="recent-activity-list">
                  {recentActivity.length === 0 ? (
                    <div className="admin-empty-state"><Package size={24} /><p>{isBn ? 'কোনো কার্যক্রম নেই।' : 'No recent activity.'}</p></div>
                  ) : (
                    recentActivity.map((event) => (
                      <div key={event.id} className="recent-activity-item">
                        <div className="activity-icon">{event.icon === 'task' ? '📋' : event.icon === 'user' ? '👤' : '✅'}</div>
                        <div className="activity-info">
                          <span className="activity-text">{event.text}</span>
                          <span className="activity-time">{new Date(event.time).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </section>

            {/* Right column: Active task panel */}
              <section className="panel-column-right">
              <section className="panel active-task-panel" id="active-task-panel">
                <div className="panel-heading"><div><h2>{isBn ? 'সক্রিয় কাজ' : 'Active task'}</h2></div></div>

                <div className="task-switcher">
                  <span className="switcher-label">{isBn ? 'কাজ বাছাই করুন' : 'Select task'}</span>
                  <select className="switcher-select" value={selectedTaskId || ''} onChange={(e) => setSelectedTaskId(e.target.value || null)}>
                    <option value="">{isBn ? 'সব কাজ' : 'All tasks'}</option>
                    {groupedTasks.active.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
                  </select>
                </div>

                {selectedTaskId ? (
                  renderActiveTaskPanel(selectedTaskId)
                ) : (
                  <div className="active-task-empty">
                    <span className="empty-icon">📭</span>
                    <h3>{isBn ? 'কোনো সক্রিয় কাজ নেই' : 'No active task right now'}</h3>
                    <p>{user.role === 'customer' ? (isBn ? 'কাজ পোস্ট করে শুরু করুন।' : 'Post a task to get started.') : (isBn ? 'খোলা কাজগুলো ব্রাউজ করুন।' : 'Browse open jobs.')}</p>
                    {user.role === 'customer' && <button className="button button-primary" onClick={scrollToPostForm}>{isBn ? 'কাজ পোস্ট করুন' : 'Post a task'}</button>}
                  </div>
                )}
              </section>
            </section>
          </section>

          {user.role === 'customer' && <section className="panel create-task-panel" id="post-task-form">
            <div className="panel-heading"><div><span className="panel-kicker">{uiText.panels.newTaskKicker}</span><h2>{uiText.panels.newTaskTitle}</h2></div><span className="panel-icon">＋</span></div>
            <form onSubmit={submitTask} className="task-create-form">
              <div className="form-row">
                <label>{uiText.panels.taskTitle}<input required minLength="3" maxLength="120" placeholder={isBn ? 'যেমন: ফার্মেসি থেকে ওষুধ আনুন' : 'Example: Pick up medicine from the pharmacy'} value={form.title} onChange={(event) => updateForm('title', event.target.value)} /></label>
                <label>{uiText.panels.estimate}<input required type="number" min="1" max="500000" step="1" placeholder={isBn ? '২৫০' : '250'} value={form.estimatedPrice} onChange={(event) => updateForm('estimatedPrice', event.target.value)} /></label>
              </div>
              <label>{uiText.panels.taskDescription}<textarea required minLength="5" maxLength="2000" rows="3" placeholder={isBn ? 'কোন ওষুধ বা জিনিস, কোনো বিশেষ নির্দেশনা থাকলে লিখুন...' : 'Add any medication, item, or special instructions...'} value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></label>
              <div className="location-form-grid">
                <LocationFields prefix="pickup" label={isBn ? 'পিকআপের' : 'Pickup'} values={form} onChange={updateForm} selectedPosition={form.pickupPosition} onSelectPosition={(position) => updateForm('pickupPosition', position)} onNotice={setNotice} />
                <LocationFields prefix="delivery" label={isBn ? 'ডেলিভারির' : 'Delivery'} values={form} onChange={updateForm} selectedPosition={form.deliveryPosition} onSelectPosition={(position) => updateForm('deliveryPosition', position)} onNotice={setNotice} />
              </div>
              <div className="form-submit-row"><span>{uiText.panels.locationHelp}</span><button className="button button-primary" disabled={submitting}>{submitting ? uiText.panels.posting : uiText.panels.post} <span aria-hidden="true">→</span></button></div>
            </form>
          </section>}

          {user.role === 'runner' && <section className="runner-location-banner">
            <span className="runner-banner-icon">⌖</span><div><b>{isBn ? 'আপনার কাছের কাজ দেখতে চান?' : 'Want to see jobs near you?'}</b><p>{isBn ? 'আপনার অবস্থান ব্যবহার করুন—শুধু ৫ কিমির মধ্যে এবং আপনার সীমার বাজেটের কাজ দেখানো হবে।' : 'Share your location to find jobs within 5 km and within your budget limit.'}</p></div>
            <button className="button button-primary" onClick={locateRunner} disabled={locationLoading}>{locationLoading ? (isBn ? 'অবস্থান খুঁজছি...' : 'Finding location...') : runnerPosition ? (isBn ? 'কাজ খুঁজুন' : 'Find jobs') : (isBn ? 'অবস্থান শেয়ার করুন' : 'Share location')}</button>
          </section>}

          {settingsOpen && (
            <div className="settings-modal-overlay" onClick={() => setSettingsOpen(false)}>
              <div className="settings-modal" onClick={(event) => event.stopPropagation()}>
                <div className="settings-modal-header">
                  <span className="settings-modal-kicker">{isBn ? 'অ্যাকাউন্ট সেটিংস' : 'Account settings'}</span>
                  <h2>{isBn ? 'প্রোফাইল ও নিরাপত্তা' : 'Profile & security'}</h2>
                  <button type="button" className="settings-modal-close" onClick={() => setSettingsOpen(false)} aria-label={isBn ? 'বন্ধ করুন' : 'Close'}>×</button>
                </div>
                <div className="settings-modal-body">
                  <div className="settings-split">
                    <div className="settings-column settings-column-profile">
                      <div className="settings-profile">
                        <h3 className="settings-column-title">{isBn ? 'প্রোফাইল তথ্য' : 'Profile information'}</h3>
                        <div className="settings-avatar-wrap">
                          {settingsForm.avatarUrl || user.avatarUrl ? (
                            <img className="settings-avatar" src={settingsForm.avatarUrl || user.avatarUrl} alt="Profile" />
                          ) : (
                            <div className="settings-avatar-empty">{user.name?.charAt(0).toUpperCase() || 'U'}</div>
                          )}
                          <label className="settings-avatar-label">
                            <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
                            <span className="settings-avatar-btn">{isBn ? 'ছবি পরিবর্তন করুন' : 'Change photo'}</span>
                          </label>
                        </div>
                        <div className="settings-row"><span>{isBn ? 'নাম' : 'Name'}</span><input type="text" required minLength="2" maxLength="80" value={settingsForm.name} onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })} /></div>
                        <div className="settings-row"><span>{isBn ? 'ইমেইল' : 'Email'}</span><input type="email" required maxLength="254" value={settingsForm.email} onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value.trim().toLowerCase() })} /></div>
                        <div className="settings-row"><span>{isBn ? 'ফোন' : 'Phone'}</span><input type="tel" required minLength="10" maxLength="20" value={settingsForm.phone} onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value.trim() })} /></div>
                        <div className="settings-row"><span>{isBn ? 'এলাকা / লোকেশন' : 'Area / Location'}</span><input type="text" required minLength="2" maxLength="120" value={settingsForm.area} onChange={(e) => setSettingsForm({ ...settingsForm, area: e.target.value })} /></div>
                        <div className="settings-row"><span>{isBn ? 'ভূমিকা' : 'Role'}</span><strong>{user.role}</strong></div>
                      </div>
                      <button type="button" className="button button-outline" onClick={saveProfile} disabled={settingsBusy} style={{ width: '100%' }}>{settingsBusy ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'প্রোফাইল সংরক্ষণ করুন' : 'Save profile')}</button>
                    </div>
                    <div className="settings-column settings-column-password">
                      <form onSubmit={updateSettings} className="settings-password-form">
                        <h3 className="settings-column-title">{isBn ? 'পাসওয়ার্ড পরিবর্তন' : 'Change password'}</h3>
                        <div className="settings-password-row">
                          <label className="password-field">
                            {isBn ? 'বর্তমান পাসওয়ার্ড' : 'Current password'}
                            <div className="password-input-wrap">
                              <input type={showCurrentPassword ? 'text' : 'password'} required minLength="8" value={settingsForm.currentPassword} onChange={(e) => setSettingsForm({ ...settingsForm, currentPassword: e.target.value })} />
                              <button type="button" className="password-toggle" onClick={() => togglePasswordVisibility('current')} aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}>
                                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </label>
                          <label className="password-field">
                            {isBn ? 'নতুন পাসওয়ার্ড' : 'New password'}
                            <div className="password-input-wrap">
                              <input type={showNewPassword ? 'text' : 'password'} required minLength="8" value={settingsForm.newPassword} onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })} />
                              <button type="button" className="password-toggle" onClick={() => togglePasswordVisibility('new')} aria-label={showNewPassword ? 'Hide password' : 'Show password'}>
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </label>
                          <label className="password-field">
                            {isBn ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm new password'}
                            <div className="password-input-wrap">
                              <input type={showConfirmPassword ? 'text' : 'password'} required minLength="8" value={settingsForm.confirmNewPassword} onChange={(e) => setSettingsForm({ ...settingsForm, confirmNewPassword: e.target.value })} />
                              <button type="button" className="password-toggle" onClick={() => togglePasswordVisibility('confirm')} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </label>
                        </div>
                        {settingsNotice && <div className={settingsNotice.includes('সফল') || settingsNotice.includes('successfully') || settingsNotice.includes('আপডেট করা হয়েছে') ? 'notice notice-success' : 'notice'} role="status">{settingsNotice}<button type="button" onClick={() => setSettingsNotice('')} aria-label={isBn ? 'বার্তা বন্ধ করুন' : 'Dismiss'}>×</button></div>}
                        <button type="submit" className="button button-primary" disabled={settingsBusy} style={{ width: '100%' }}>{settingsBusy ? (isBn ? 'আপডেট হচ্ছে...' : 'Updating...') : (isBn ? 'পাসওয়ার্ড আপডেট করুন' : 'Update password')}</button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <section className="tasks-section" id="tasks">
            <div className="panel-heading tasks-heading">
              <div>
                <h2>{isBn ? 'আমার কাজ' : 'My tasks'}</h2>
              </div>
              {user.role === 'customer' && (
                <div className="task-tabs">
                  {['active', 'pending', 'completed', 'cancelled'].map((tab) => {
                    const label = tab === 'active' ? (isBn ? 'সক্রিয়' : 'Active') : tab === 'pending' ? (isBn ? 'অপেক্ষমাণ' : 'Pending') : tab === 'completed' ? (isBn ? 'সম্পন্ন' : 'Completed') : (isBn ? 'বাতিল' : 'Cancelled');
                    return <button key={tab} type="button" className={`task-tab-btn ${customerTab === tab ? 'active' : ''}`} onClick={() => setCustomerTab(tab)}>{label}</button>;
                  })}
                </div>
              )}
              {user.role === 'runner' && (
                <div className="task-tabs">
                  {['open', 'mytasks', 'completed'].map((tab) => {
                    const label = tab === 'open' ? (isBn ? 'খোলা কাজ' : 'Open jobs') : tab === 'mytasks' ? (isBn ? 'আমার কাজ' : 'My tasks') : (isBn ? 'সম্পন্ন' : 'Completed');
                    return <button key={tab} type="button" className={`task-tab-btn ${runnerTab === tab ? 'active' : ''}`} onClick={() => setRunnerTab(tab)}>{label}</button>;
                  })}
                </div>
              )}
              <button className="button button-outline button-small" onClick={() => { load(); refreshNearby(); }} disabled={loading}>{loading ? (isBn ? 'লোড হচ্ছে...' : 'Loading...') : (isBn ? '↻ হালনাগাদ' : '↻ Refresh')}</button>
            </div>
            {user.role === 'runner' && (
              <div className="marketplace-search-row">
                <input value={marketSearch} onChange={(event) => setMarketSearch(event.target.value)} placeholder={isBn ? 'কীওয়ার্ড: medicine, parcel...' : 'Keyword: medicine, parcel...'} />
                <input value={marketLocation} onChange={(event) => setMarketLocation(event.target.value)} placeholder={isBn ? 'লোকেশন / এলাকা: Gulshan, Banani...' : 'Location / area: Gulshan, Banani...'} />
                <button className="button button-outline button-small" type="button" onClick={() => { setMarketSearch(''); setMarketLocation(''); }}>{isBn ? 'ক্লিয়ার' : 'Clear'}</button>
              </div>
            )}
            {openDisputes.length > 0 && isAdmin && <div className="admin-alert">⚑ {openDisputes.length.toLocaleString(isBn ? 'bn-BD' : 'en-US')}{isBn ? 'টি খোলা সমস্যা—নিচের কাজগুলো পর্যালোচনা করুন।' : ` ${uiText.panels.openIssues}`}</div>}
            {user.role === 'runner' && visibleTasks.length === 0 && !loading && (
              <div className="empty-state">
                <span>⌖</span>
                <h3>{runnerPosition ? (isBn ? 'এখনও কোনো কাজ মেলেনি' : 'No jobs found yet') : (isBn ? 'কাছের কাজ দেখতে অবস্থান দিন' : 'Share your location to view nearby jobs')}</h3>
                <p>{runnerPosition ? (isBn ? `নতুন কাজ এলে আবার খুঁজুন। আপনার কাজের সীমা ৳${Number(user.runnerLimit).toLocaleString('bn-BD')} পর্যন্ত।` : `When new jobs appear, they will show here. Your task limit is ৳${Number(user.runnerLimit).toLocaleString('en-US')}.`) : (isBn ? 'আপনার তথ্য শেয়ার করা হবে না; শুধু কাছের খোলা কাজ খুঁজতেই এটি ব্যবহার হয়।' : 'Your information is not shared; this is only used to find nearby open jobs.')}</p>
                <button className="button button-primary" onClick={locateRunner} disabled={locationLoading}>
                  {locationLoading ? (isBn ? 'খুঁজছি...' : 'Finding...') : (isBn ? 'অবস্থান শেয়ার করুন' : 'Share location')}
                </button>
              </div>
            )}
            {user.role !== 'runner' && tasks.length === 0 && !loading && <div className="empty-state"><span>✳</span><h3>{isBn ? 'এখনও কোনো কাজ পোস্ট করেননি' : 'You have not posted a task yet'}</h3><p>{isBn ? 'উপরে ফর্মটি পূরণ করে আপনার প্রথম কাজটি পোস্ট করুন।' : 'Fill the form above to post your first task.'}</p></div>}
            <div className="task-list task-list-grid">
              {(user.role === 'customer'
                ? (customerTab === 'active' ? groupedTasks.active : customerTab === 'pending' ? groupedTasks.pending : customerTab === 'completed' ? groupedTasks.completed : groupedTasks.cancelled)
                : (runnerTab === 'open' ? openJobs : runnerTab === 'mytasks' ? uniqueTasks.filter((t) => String(t.runnerId?._id || t.runnerId) === String(user.id) && ACTIVE_STATUSES.includes(t.status)) : groupedTasks.completed))
                .slice(0, 4).map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  user={user}
                  onRefresh={refreshAll}
                  onError={setNotice}
                  bids={bids}
                  setBids={setBids}
                  runnerPosition={runnerPosition}
                  statusNames={statusNames}
                  deliveryStages={deliveryStages}
                  copy={taskCardCopy}
                  onOpenChat={(nextTask) => { setChatTask(nextTask); setChatOpen(true); }}
                  onReview={setReviewTask}
                  selected={selectedTaskIds.includes(task._id)}
                  onToggleSelect={toggleTaskSelect}
                  onAdminEdit={openEditTask}
                  onAdminDelete={(item) => setConfirmAction({
                    message: isBn ? 'এই কাজটি স্থায়ীভাবে মুছে যাবে।' : 'This task will be permanently deleted.',
                    action: async () => { await api.adminDeleteTask(item._id); await load(); },
                  })}
                />
              ))}
              {((user.role === 'customer'
                ? (customerTab === 'active' ? groupedTasks.active : customerTab === 'pending' ? groupedTasks.pending : customerTab === 'completed' ? groupedTasks.completed : groupedTasks.cancelled)
                : (runnerTab === 'open' ? openJobs : runnerTab === 'mytasks' ? uniqueTasks.filter((t) => String(t.runnerId?._id || t.runnerId) === String(user.id) && ACTIVE_STATUSES.includes(t.status)) : groupedTasks.completed))
                .length > 4) && (
                <button type="button" className="button button-outline button-small" onClick={() => { setCustomerTab('all'); }}>{isBn ? 'সব দেখুন' : 'View all'}</button>
              )}
              {((user.role === 'customer'
                ? (customerTab === 'active' ? groupedTasks.active : customerTab === 'pending' ? groupedTasks.pending : customerTab === 'completed' ? groupedTasks.completed : groupedTasks.cancelled)
                : (runnerTab === 'open' ? openJobs : runnerTab === 'mytasks' ? uniqueTasks.filter((t) => String(t.runnerId?._id || t.runnerId) === String(user.id) && ACTIVE_STATUSES.includes(t.status)) : groupedTasks.completed))
                .length === 0) && (
                <div className="empty-state">
                  <span>📭</span>
                  <h3>{user.role === 'runner' ? (runnerTab === 'open' ? (isBn ? 'কোনো খোলা কাজ নেই' : 'No open jobs yet') : runnerTab === 'mytasks' ? (isBn ? 'কোনো সক্রিয় কাজ নেই' : 'No active tasks') : (isBn ? 'কোনো সম্পন্ন কাজ নেই' : 'No completed tasks')) : (isBn ? 'কোনো কাজ নেই' : 'No tasks yet')}</h3>
                  <p>{isBn ? 'এই ট্যাবের জন্য কোনো কাজ নেই।' : 'No tasks for this tab yet.'}</p>
                </div>
              )}
            </div>
          </section>

          <p className="safety-note"><span>♧</span> {isBn ? 'প্রতিটি পিকআপ ও ডেলিভারি OTP দিয়ে নিশ্চিত হয়। কখনো NID চাওয়া হবে না।' : 'Every pickup and delivery is confirmed with OTP. NID is never required.'}</p>
        </>
      )}

      {chatOpen && chatTask && <ChatPanel task={chatTask} user={user} language={language} open={chatOpen} onClose={() => { setChatOpen(false); setChatTask(null); }} />}
      <ReviewModal
        open={Boolean(reviewTask)}
        task={reviewTask}
        language={language}
        onClose={() => setReviewTask(null)}
        onSubmitted={(result) => {
          setNotice(result.message || (isBn ? 'রিভিউ জমা হয়েছে।' : 'Thank you for your review!'));
          load();
        }}
      />
      {editTask && (
        <div className="confirm-overlay" onClick={() => setEditTask(null)}>
          <form className="review-modal" onClick={(event) => event.stopPropagation()} onSubmit={saveEditTask}>
            <h3>{isBn ? 'কাজ সম্পাদনা' : 'Edit task'}</h3>
            <label>{isBn ? 'শিরোনাম' : 'Title'}<input value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} required /></label>
            <label>{isBn ? 'বিবরণ' : 'Description'}<textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} required /></label>
            <label>{isBn ? 'বাজেট' : 'Budget'}<input type="number" value={editForm.estimatedPrice} onChange={(event) => setEditForm({ ...editForm, estimatedPrice: event.target.value })} required /></label>
            <label>{isBn ? 'পিকআপ' : 'Pickup'}<input value={editForm.pickupAddress} onChange={(event) => setEditForm({ ...editForm, pickupAddress: event.target.value })} required /></label>
            <label>{isBn ? 'ডেলিভারি' : 'Delivery'}<input value={editForm.deliveryAddress} onChange={(event) => setEditForm({ ...editForm, deliveryAddress: event.target.value })} required /></label>
            <label>{isBn ? 'স্ট্যাটাস' : 'Status'}
              <select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
                {['pending', 'accepted', 'picked-up', 'in-transit', 'arriving', 'completed', 'cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <div className="confirm-actions">
              <button type="button" className="button button-outline" onClick={() => setEditTask(null)}>{isBn ? 'বাতিল' : 'Cancel'}</button>
              <button type="submit" className="button button-primary">{isBn ? 'সংরক্ষণ' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={isBn ? 'নিশ্চিত করুন' : 'Please confirm'}
        message={confirmAction?.message || ''}
        danger
        confirmLabel={isBn ? 'হ্যাঁ' : 'Yes'}
        cancelLabel={isBn ? 'না' : 'No'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          const action = confirmAction?.action;
          setConfirmAction(null);
          try {
            await action?.();
          } catch (error) {
            setNotice(error.message);
          }
        }}
      />
    </div>
  );
}

function Home(props) {
  const { user } = useAuth();
  if (!user) return null;
  return <HomeInner {...props} />;
}

export default Home;