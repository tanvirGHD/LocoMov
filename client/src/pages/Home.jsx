import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import ChatPanel from '../components/ChatPanel';
import ReviewModal from '../components/ReviewModal';
import AdminControlPanel from '../components/AdminControlPanel';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { Bike, MapPin, ShieldCheck, Eye, Users, Lock, Activity, Globe } from 'lucide-react';

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
  }
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
  ]
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
      {searchingLocation && <div className="location-searching">সuggesting locations...</div>}
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

function TaskMap({ tasks, center, radius = false }) {
  const mapCenter = center || dhaka;
  return (
    <div className="map-frame">
      <MapContainer center={mapCenter} zoom={15} maxZoom={19} scrollWheelZoom doubleClickZoom zoomControl key={`${mapCenter[0]}-${mapCenter[1]}`}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        {radius && <Circle center={mapCenter} radius={5000} pathOptions={{ color: '#984826', fillColor: '#984826', fillOpacity: 0.06, weight: 1 }} />}
        {tasks.map((task) => {
          const point = coordinates(task.pickupLocation);
          if (!point) return null;
          return <Marker key={task._id} position={point} icon={taskIcon}><Popup><b>{task.title}</b><br />{task.pickupAddress || 'পিকআপ স্থান'}<br />{money(task.finalPrice ?? task.estimatedPrice)}</Popup></Marker>;
        })}
      </MapContainer>
      <div className="map-caption"><span className="online-dot" />{tasks.length}টি কাজ মানচিত্রে</div>
    </div>
  );
}

function StatCard({ icon, label, value, tone = '', language = 'en' }) {
  const locale = language === 'bn' ? 'bn-BD' : 'en-US';
  const displayValue = typeof value === 'number' ? value.toLocaleString(locale) : value || (language === 'bn' ? '০' : '0');
  return <article className={`stat-card ${tone}`}><span className="stat-icon">{icon}</span><div><span>{label}</span><b>{displayValue}</b></div></article>;
}

function TaskCard({ task, user, onRefresh, onError, bids, setBids, runnerPosition, loadNearby, statusNames, deliveryStages, copy, onOpenChat, onReview, selected, onToggleSelect, onAdminEdit, onAdminDelete }) {
  const [otp, setOtp] = useState('');
  const [bidForm, setBidForm] = useState({ proposedPrice: task.estimatedPrice, deliveryTime: 30 });
  const [loading, setLoading] = useState(false);
  const [bidLoading, setBidLoading] = useState(false);
  const [showBids, setShowBids] = useState(false);
  const isRunner = user.role === 'runner';
  const isAdmin = user.role === 'admin';
  const canChat = user.role !== 'admin' && !!task.runnerId && ['accepted', 'picked-up', 'in-transit', 'arriving', 'completed', 'cancelled'].includes(task.status);
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

  async function loadBids() {
    setShowBids((previous) => !previous);
    if (bids[task._id]) return;
    try {
      const result = await api.bids(task._id);
      setBids((current) => ({ ...current, [task._id]: result.bids }));
    } catch (error) {
      onError(error.message);
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

  async function chooseBid(bidId) {
    setLoading(true);
    try {
      await api.acceptBid(task._id, bidId);
      await onRefresh();
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
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
      {['accepted', 'picked-up', 'in-transit', 'arriving', 'completed'].includes(task.status) && <ol className="delivery-progress" aria-label={copy.progressLabel}>
        {deliveryStages.map((stage, index) => {
          const currentIndex = deliveryStages.findIndex((item) => item.status === task.status);
          const complete = currentIndex >= index;
          return <li key={stage.status} className={`${complete ? 'stage-complete' : ''} ${task.status === stage.status ? 'stage-current' : ''}`}>
            <span className="stage-marker">{complete ? '✓' : index + 1}</span><small>{stage.label}</small>
          </li>;
        })}
      </ol>}
      {user.role === 'customer' && ['accepted', 'picked-up', 'in-transit', 'arriving'].includes(task.status) && (task.pickupOTP || task.deliveryOTP) &&
        <div className="customer-otp"><span>{copy.secureShare}</span><b>{copy.otpText}: {task.pickupOTP} <i>·</i> {copy.deliveryOtpText}: {task.deliveryOTP}</b></div>}
      {isRunner && task.status === 'accepted' && <form className="otp-form" onSubmit={(event) => { event.preventDefault(); act('pickup'); }}>
        <label>{copy.customerOtp}<input inputMode="numeric" maxLength="4" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder={copy.otpPlaceHolder} required /></label>
        <button className="button button-primary button-small" disabled={loading}>{loading ? copy.verifying : copy.confirmPickup}</button>
      </form>}
      {isRunner && task.status === 'picked-up' && <div className="runner-stage-action">
        <p>{copy.orderPicked}</p>
        <button className="button button-primary button-small" onClick={() => act('depart')} disabled={loading}>{loading ? copy.updating : copy.departed}</button>
      </div>}
      {isRunner && task.status === 'in-transit' && <div className="runner-stage-action">
        <p>{copy.nearDestination}</p>
        <button className="button button-primary button-small" onClick={() => act('arriving')} disabled={loading}>{loading ? copy.updating : copy.nearby}</button>
      </div>}
      {isRunner && task.status === 'arriving' && <form className="otp-form" onSubmit={(event) => { event.preventDefault(); act('delivery'); }}>
        <label>{copy.deliveryOtpLabel}<input inputMode="numeric" maxLength="4" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder={copy.otpPlaceHolder} required /></label>
        <button className="button button-primary button-small" disabled={loading}>{loading ? copy.verifying : copy.confirmDelivery}</button>
      </form>}
      {task.disputeStatus === 'open' && isAdmin && <button className="button button-primary button-small" onClick={resolve}>{copy.resolveIssue}</button>}
      {task.disputeStatus === 'open' && <p className="dispute-reason">{copy.reasonLabel}: {task.disputeReason}</p>}
      {task.status === 'pending' && isRunner && <div className="runner-task-actions">
        <button className="button button-primary button-small" onClick={() => act('accept')} disabled={loading}>{loading ? copy.waiting : copy.takeJob}</button>
        <form className="bid-form" onSubmit={sendBid}>
          <label>{copy.offer} ৳<input type="number" min="1" max={Math.min(user.runnerLimit, task.estimatedPrice)} value={bidForm.proposedPrice} onChange={(event) => setBidForm({ ...bidForm, proposedPrice: event.target.value })} required /></label>
          <label>{copy.minutes}<input type="number" min="1" max="10080" value={bidForm.deliveryTime} onChange={(event) => setBidForm({ ...bidForm, deliveryTime: event.target.value })} required /></label>
          <button className="button button-outline button-small" disabled={bidLoading}>{bidLoading ? copy.sending : copy.sendOffer}</button>
        </form>
      </div>}
      {task.status === 'pending' && user.role === 'customer' && <button className="text-button" onClick={loadBids}>{showBids ? copy.hideOffers : copy.viewOffers} <span>({bids[task._id]?.length || '—'})</span></button>}
      {showBids && user.role === 'customer' && <div className="bid-list">
        {(bids[task._id] || []).length === 0 ? <p>{copy.noOffers}</p> : (bids[task._id] || []).map((bid) => <div className="bid-row" key={bid._id}>
          <span className="runner-avatar small-avatar">{bid.runnerId?.name?.slice(0, 1) || 'R'}</span>
          <div><b>{bid.runnerId?.name || copy.runner}</b><small>{copy.trustScore} {Number(bid.runnerId?.trustScore || 100).toLocaleString(copy.numberLocale)} · {bid.deliveryTime.toLocaleString(copy.numberLocale)} {copy.minutesShort}</small></div>
          <strong>{money(bid.proposedPrice)}</strong>
          <button className="button button-primary button-small" onClick={() => chooseBid(bid._id)} disabled={loading || bid.status !== 'pending'}>{bid.status === 'accepted' ? copy.selected : bid.status === 'rejected' ? copy.rejected : copy.accept}</button>
        </div>)}
      </div>}
      {canChat && <div className="task-footer-actions"><button className="button button-outline button-small" onClick={() => onOpenChat(task)}>{chatReadOnly ? copy.chatReadOnly : copy.chat}</button></div>}
      {canReview && <button className="button button-primary button-small" onClick={() => onReview(task)}>{copy.rateRunner}</button>}
      {isCustomerOwner && task.customerRating ? <p className="given-rating">{copy.yourRating}: {'★'.repeat(task.customerRating)}{'☆'.repeat(5 - task.customerRating)}</p> : null}
      {((canCancel && (user.role === 'admin' || isCustomerOwner || (isRunner && String(task.runnerId?._id || task.runnerId) === String(user.id)))) || canDeletePost || isAdmin) ?
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

export default function Home({ language = 'en' }) {
  const { user, refreshUser } = useAuth();
  const { search } = useLocation();
  const focusTaskId = new URLSearchParams(search).get('taskId');
  const isBn = language === 'bn';
  const DashboardRoleIcon = user.role === 'runner' ? Bike : user.role === 'admin' ? ShieldCheck : MapPin;
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
    },
    admin: {
      title: 'ব্যবহারকারী পরিচালনা',
      kicker: 'নিরাপদ কমিউনিটি',
      empty: 'এখনও কোনো ব্যবহারকারী নিবন্ধন করেননি।',
      runner: 'রানার',
      admin: 'অ্যাডমিন',
      customer: 'গ্রাহক',
      active: 'সক্রিয়',
      inactive: 'নিষ্ক্রিয়',
      disable: 'নিষ্ক্রিয় করুন',
      enable: 'সক্রিয় করুন',
    },
    panels: {
      weekly: 'সাপ্তাহিক চিত্র',
      progress: 'কাজের অগ্রগতি',
      local: 'স্থানীয় নেটওয়ার্ক',
      map: 'কাছাকাছি কাজের মানচিত্র',
      find: 'আমার অবস্থান',
      findAgain: 'আবার খুঁজুন',
      searching: 'খুঁজছি...',
      newTaskKicker: 'কয়েক মিনিটেই তৈরি',
      newTaskTitle: 'নতুন কাজ পোস্ট করুন',
      taskTitle: 'কাজের শিরোনাম',
      taskDescription: 'কাজের বিস্তারিত',
      estimate: 'আনুমানিক বাজেট (টাকা)',
      locationHelp: 'আপনার সঠিক স্থান রানারের কাছে কাজটি পৌঁছাতে সাহায্য করবে।',
      post: 'কাজ পোস্ট করুন',
      posting: 'পোস্ট হচ্ছে...',
      nearbyKicker: 'আপনার রুটে',
      nearbyTitle: 'আমার ও কাছের কাজ',
      allTasks: 'আপনার কাজগুলো',
      allTitle: 'আমার কাজ',
      adminTasks: 'সাম্প্রতিক কাজ',
      refresh: '↻ হালনাগাদ',
      refreshLoading: 'লোড হচ্ছে...',
      openIssues: 'টি খোলা সমস্যা—নিচের কাজগুলো পর্যালোচনা করুন।',
      shareLocation: 'আপনার কাছের কাজ দেখতে অবস্থান দিন',
      shareLocationText: 'আপনার তথ্য শেয়ার করা হবে না; শুধু কাছের খোলা কাজ খুঁজতেই এটি ব্যবহার হয়।',
      showNearby: 'আমার কাছের কাজ দেখান',
      noNearby: 'এখনও কোনো কাজ মেলেনি',
      noNearbyText: 'নতুন কাজ এলে আবার খুঁজুন। আপনার কাজের সীমা ৳{limit} পর্যন্ত।',
      noTask: 'এখনও কোনো কাজ পোস্ট করেননি',
      noTaskAdmin: 'এখনও কোনো কাজ নেই',
      noTaskText: 'উপরে ফর্মটি পূরণ করে আপনার প্রথম কাজটি পোস্ট করুন।',
      noTaskAdminText: 'কমিউনিটিতে কাজ শুরু হলে এখানে দেখা যাবে।',
      safety: 'প্রতিটি পিকআপ ও ডেলিভারি OTP দিয়ে নিশ্চিত হয়। কখনো NID চাওয়া হবে না।',
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
    },
    admin: {
      title: 'Manage users',
      kicker: 'Safe community',
      empty: 'No users have registered yet.',
      runner: 'Runner',
      admin: 'Admin',
      customer: 'Customer',
      active: 'Active',
      inactive: 'Inactive',
      disable: 'Disable',
      enable: 'Enable',
    },
    panels: {
      weekly: 'Weekly view',
      progress: 'Task progress',
      local: 'Local network',
      map: 'Nearby jobs map',
      find: 'My location',
      findAgain: 'Find again',
      searching: 'Finding...',
      newTaskKicker: 'Ready in minutes',
      newTaskTitle: 'Post a new task',
      taskTitle: 'Task title',
      taskDescription: 'Task details',
      estimate: 'Estimated budget (BDT)',
      locationHelp: 'Your exact location helps the runner reach the task quickly.',
      post: 'Post task',
      posting: 'Posting...',
      nearbyKicker: 'Your route',
      nearbyTitle: 'My and nearby jobs',
      allTasks: 'Your tasks',
      allTitle: 'My tasks',
      adminTasks: 'Recent tasks',
      refresh: '↻ Refresh',
      refreshLoading: 'Loading...',
      openIssues: 'open issues—review the task list below.',
      shareLocation: 'Share your location to find nearby jobs',
      shareLocationText: 'Your info will not be shared; this is only used to find nearby active jobs.',
      showNearby: 'Show nearby jobs',
      noNearby: 'No jobs found yet',
      noNearbyText: 'New jobs will appear here when available. Your task limit is ৳{limit}.',
      noTask: 'You have not posted a task yet',
      noTaskAdmin: 'No jobs available yet',
      noTaskText: 'Fill the form above to post your first job.',
      noTaskAdminText: 'Once work starts in the community, it will appear here.',
      safety: 'Every pickup and delivery is confirmed with OTP. NID is never required.',
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
    viewOffers: 'রানারদের প্রস্তাব দেখুন',
    hideOffers: 'প্রস্তাব লুকান',
    noOffers: 'এখনও কোনো প্রস্তাব আসেনি।',
    chat: 'চ্যাট',
    chatReadOnly: 'চ্যাট দেখুন',
    trustScore: 'বিশ্বাস স্কোর',
    minutesShort: 'মিনিট',
    selected: 'নির্বাচিত',
    rejected: 'প্রত্যাখ্যাত',
    accept: 'গ্রহণ',
    cancelTask: 'কাজ বাতিল',
    deleteTask: 'পোস্ট মুছুন',
    deleting: 'মুছছে...',
    reportIssue: 'সমস্যা জানান',
    mapHint: 'পিকআপ ও ডেলিভারি স্থান মানচিত্রে দেখানো হয়েছে।',
    confirmDelete: 'এই কাজের পোস্টটি স্থায়ীভাবে মুছে ফেলবেন?',
    requireLocation: 'কাজ নিতে আগে আপনার অবস্থান শেয়ার করুন',
    cancelReason: 'ব্যবহারকারীর অনুরোধে বাতিল',
    disputePrompt: 'সমস্যার বিস্তারিত লিখুন (অন্তত ১০ অক্ষর)',
    deleteSuccess: 'আপনার কাজের পোস্টটি মুছে ফেলা হয়েছে।',
    requireLocationBid: 'প্রস্তাব দিতে আগে আপনার অবস্থান শেয়ার করুন',
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
    viewOffers: 'View runner offers',
    hideOffers: 'Hide offers',
    noOffers: 'No offers yet.',
    chat: 'Chat',
    chatReadOnly: 'View chat',
    trustScore: 'Trust score',
    minutesShort: 'mins',
    selected: 'Selected',
    rejected: 'Rejected',
    accept: 'Accept',
    cancelTask: 'Cancel task',
    deleteTask: 'Delete post',
    deleting: 'Deleting...',
    reportIssue: 'Report issue',
    mapHint: 'Pickup and delivery locations are shown on the map.',
    confirmDelete: 'Delete this task permanently?',
    requireLocation: 'Share your location before accepting a task',
    cancelReason: 'Cancelled at customer request',
    disputePrompt: 'Describe the issue (at least 10 characters)',
    deleteSuccess: 'Your task post was deleted.',
    requireLocationBid: 'Share your location before submitting a bid',
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
  const [nearbyTasks, setNearbyTasks] = useState([]);
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
  const [editTask, setEditTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', estimatedPrice: '', pickupAddress: '', deliveryAddress: '', status: 'pending' });
  const [confirmAction, setConfirmAction] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', estimatedPrice: '',
    pickupAddress: '', pickupPosition: null,
    deliveryAddress: '', deliveryPosition: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setNotice('');
    try {
      const [dashboardData, taskData, currentUser, userData] = await Promise.all([
        api.dashboard(),
        api.tasks(),
        refreshUser(),
        user.role === 'admin' ? api.adminUsers() : Promise.resolve({ users: [] }),
      ]);
      setDashboard(dashboardData);
      setTasks(taskData.tasks);
      setAdminUsers(userData.users);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }, [refreshUser, user.role]);

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
    if (user.role !== 'customer') return undefined;
    const intervalId = window.setInterval(async () => {
      try {
        const result = await api.tasks();
        setTasks(result.tasks);
      } catch (error) {
        setNotice(error.message);
      }
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [user.role]);

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
      setNotice(isBn ? 'অবস্থান অনুমতি না পাওয়ায় ঢাকার অবস্থান ব্যবহৃত হচ্ছে।' : 'Using Dhaka location as default.');
      setLocationLoading(false);
    }, { enableHighAccuracy: true, timeout: 8000 });
  };

  const currentCenter = useMemo(() => runnerPosition || dhaka, [runnerPosition]);
  const filteredTasks = useMemo(() => {
    if (user.role !== 'runner') return tasks;
    const keyword = marketSearch.trim().toLowerCase();
    const location = marketLocation.trim().toLowerCase();
    return tasks.filter((task) => {
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
  }, [tasks, user.role, marketSearch, marketLocation]);

  const visibleTasks = user.role === 'runner'
    ? filteredTasks
    : tasks;

  useEffect(() => {
    if (!focusTaskId || loading) return undefined;
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

  function toggleTaskSelect(taskId) {
    setSelectedTaskIds((current) => current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]);
  }

  function openEditTask(task) {
    setEditTask(task);
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      estimatedPrice: task.estimatedPrice || '',
      pickupAddress: task.pickupAddress || '',
      deliveryAddress: task.deliveryAddress || '',
      status: task.status,
    });
  }

  async function saveEditTask(event) {
    event.preventDefault();
    if (!editTask) return;
    if (!window.confirm(isBn ? 'এই কাজের পরিবর্তন সংরক্ষণ করবেন?' : 'Save these task changes?')) return;
    try {
      await api.adminUpdateTask(editTask._id, {
        title: editForm.title,
        description: editForm.description,
        estimatedPrice: Number(editForm.estimatedPrice),
        pickupAddress: editForm.pickupAddress,
        deliveryAddress: editForm.deliveryAddress,
        status: editForm.status,
      });
      setEditTask(null);
      setNotice(isBn ? 'কাজটি আপডেট হয়েছে।' : 'Task updated.');
      await load();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function submitTask(event) {
    event.preventDefault();
    if (!form.pickupPosition || !form.deliveryPosition) {
      setNotice('কাজ পোস্ট করার আগে পিকআপ ও ডেলিভারির স্থান মানচিত্রে বাছাই করুন।');
      return;
    }
    setSubmitting(true);
    setNotice('');
    try {
      await api.createTask({
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
      setNotice('আপনার কাজটি পোস্ট হয়েছে। কাছের রানাররা এখন এটি দেখতে পারবেন।');
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dashboard-page page-width">
      <section className={`dashboard-welcome ${user.role === 'admin' ? 'dashboard-welcome-admin' : ''}`}>
        <div className="dashboard-welcome-copy">
          <div className={`eyebrow dashboard-role-eyebrow role-${user.role}`}>
            <span className="dashboard-role-icon"><DashboardRoleIcon size={14} strokeWidth={2.4} /></span>
            <span className="dashboard-role-label">{user.role === 'runner' ? uiText.header.runner : user.role === 'admin' ? uiText.header.admin : uiText.header.customer}</span>
          </div>
          <h1>{user.role === 'runner' ? uiText.header.runnerTitle(user.name.split(' ')[0]) : user.role === 'admin' ? uiText.header.adminTitle : uiText.header.customerTitle(user.name.split(' ')[0])}</h1>
          <p>{user.role === 'runner' ? uiText.header.runnerText : user.role === 'admin' ? uiText.header.adminText : uiText.header.customerText}</p>
          <div className="profile-chip">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="profile-avatar-img" />
            ) : (
              <span className="profile-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            )}
            <div>
              <b>{user.name}</b>
              <small>{user.role === 'runner' ? uiText.header.runnerRole : user.role === 'admin' ? uiText.header.adminRole : uiText.header.customerRole}</small>
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

      {notice && <div className={notice.includes('পোস্ট হয়েছে') || notice.includes('পাঠানো হয়েছে') ? 'notice notice-success' : 'notice'} role="status">{notice}<button onClick={() => setNotice('')} aria-label="বার্তা বন্ধ করুন">×</button></div>}

      <section className="stats-grid dashboard-stats">
        <StatCard icon="▣" label={uiText.stats.total} value={dashboard.stats.total} language={language} />
        <StatCard icon="◷" label={uiText.stats.pending} value={dashboard.stats.pending} tone="stat-amber" language={language} />
        <StatCard icon="⌁" label={uiText.stats.active} value={dashboard.stats.active} tone="stat-blue" language={language} />
        <StatCard icon="✓" label={uiText.stats.completed} value={dashboard.stats.completed} tone="stat-green" language={language} />
        {user.role === 'runner' && <StatCard icon="✦" label={uiText.stats.trust} value={user.trustScore} tone="stat-green" language={language} />}
        {user.role === 'runner' && <StatCard icon="৳" label={uiText.stats.limit} value={money(user.runnerLimit)} tone="stat-blue" language={language} />}
      </section>

      {user.role === 'admin' && <AdminControlPanel language={language} users={adminUsers} tasks={tasks} onNotice={setNotice} onUsersChange={load} />}

      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="panel-heading"><div><span className="panel-kicker">{uiText.panels.weekly}</span><h2>{uiText.panels.progress}</h2></div><span className="panel-icon">↗</span></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.activity} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#e9eee9" vertical={false} strokeDasharray="3 5" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short' })} tickLine={false} axisLine={false} tick={{ fill: '#8a958e', fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#8a958e', fontSize: 11 }} />
                <Tooltip labelFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')} formatter={(value) => [isBn ? `${value}টি` : `${value} tasks`, isBn ? 'কাজ' : 'Tasks']} />
                <Bar dataKey="count" fill="#984826" radius={[6, 6, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel map-panel">
          <div className="panel-heading"><div><span className="panel-kicker">{uiText.panels.local}</span><h2>{uiText.panels.map}</h2></div>
            {user.role === 'runner' && <button className="button button-outline button-small" onClick={locateRunner} disabled={locationLoading}>{locationLoading ? uiText.panels.searching : runnerPosition ? uiText.panels.findAgain : uiText.panels.find}</button>}
          </div>
          <TaskMap tasks={visibleTasks} center={currentCenter} radius={user.role === 'runner' && !!runnerPosition} />
        </section>
      </div>

      {user.role === 'customer' && <section className="panel create-task-panel">
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

      <section className="tasks-section" id="tasks">
        <div className="panel-heading tasks-heading"><div><span className="panel-kicker">{user.role === 'runner' ? (isBn ? 'আপনার রুটে' : 'Your route') : (isBn ? 'আপনার কাজগুলো' : 'Your tasks')}</span><h2>{user.role === 'runner' ? (isBn ? 'সব খোলা কাজ' : 'All open jobs') : user.role === 'admin' ? (isBn ? 'সাম্প্রতিক কাজ' : 'Recent tasks') : (isBn ? 'আমার কাজ' : 'My jobs')}</h2></div>
          <button className="button button-outline button-small" onClick={() => { load(); refreshNearby(); }} disabled={loading}>{loading ? (isBn ? 'লোড হচ্ছে...' : 'Loading...') : (isBn ? '↻ হালনাগাদ' : '↻ Refresh')}</button>
        </div>
        {user.role === 'runner' && (
          <div className="marketplace-search-row">
            <input value={marketSearch} onChange={(event) => setMarketSearch(event.target.value)} placeholder={isBn ? 'কীওয়ার্ড: medicine, parcel...' : 'Keyword: medicine, parcel...'} />
            <input value={marketLocation} onChange={(event) => setMarketLocation(event.target.value)} placeholder={isBn ? 'লোকেশন / এলাকাঃ Gulshan, Banani...' : 'Location / area: Gulshan, Banani...'} />
            <button className="button button-outline button-small" type="button" onClick={() => { setMarketSearch(''); setMarketLocation(''); }}>{isBn ? 'ক্লিয়ার' : 'Clear'}</button>
          </div>
        )}
        {user.role === 'admin' && selectedTaskIds.length > 0 && (
          <div className="admin-bulk-bar">
            <span>{selectedTaskIds.length} {isBn ? 'টি নির্বাচিত' : 'selected'}</span>
            <button className="button button-outline button-small" type="button" onClick={() => setConfirmAction({
              message: isBn ? 'নির্বাচিত কাজগুলো স্থায়ীভাবে মুছবেন?' : 'Permanently delete the selected tasks?',
              action: async () => {
                await api.adminBulkDeleteTasks(selectedTaskIds);
                setSelectedTaskIds([]);
                await load();
              },
            })}>{isBn ? 'নির্বাচিতগুলো মুছুন' : 'Delete selected'}</button>
          </div>
        )}
        {user.role === 'admin' && openDisputes.length > 0 && <div className="admin-alert">⚑ {openDisputes.length.toLocaleString(isBn ? 'bn-BD' : 'en-US')}{isBn ? 'টি খোলা সমস্যা—নিচের কাজগুলো পর্যালোচনা করুন।' : uiText.panels.openIssues}</div>}
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
        {user.role !== 'runner' && tasks.length === 0 && !loading && <div className="empty-state"><span>✳</span><h3>{user.role === 'admin' ? (isBn ? 'এখনও কোনো কাজ নেই' : 'No jobs yet') : (isBn ? 'এখনও কোনো কাজ পোস্ট করেননি' : 'You have not posted a task yet')}</h3><p>{user.role === 'customer' ? (isBn ? 'উপরে ফর্মটি পূরণ করে আপনার প্রথম কাজটি পোস্ট করুন।' : 'Fill the form above to post your first task.') : (isBn ? 'কমিউনিটিতে কাজ শুরু হলে এখানে দেখা যাবে।' : 'Once work starts in the community, it will appear here.')}</p></div>}
        <div className="task-list">
          {visibleTasks.map((task) => <TaskCard key={task._id} task={task} user={user} onRefresh={refreshAll} onError={setNotice} bids={bids} setBids={setBids} runnerPosition={runnerPosition} loadNearby={refreshNearby} statusNames={statusNames} deliveryStages={deliveryStages} copy={taskCardCopy} onOpenChat={(nextTask) => { setChatTask(nextTask); setChatOpen(true); }} onReview={setReviewTask} selected={selectedTaskIds.includes(task._id)} onToggleSelect={toggleTaskSelect} onAdminEdit={openEditTask} onAdminDelete={(item) => setConfirmAction({
            message: isBn ? 'এই কাজটি স্থায়ীভাবে মুছে যাবে।' : 'This task will be permanently deleted.',
            action: async () => { await api.adminDeleteTask(item._id); await load(); },
          })} />)}
        </div>
      </section>
      <p className="safety-note"><span>♧</span> {isBn ? 'প্রতিটি পিকআপ ও ডেলিভারি OTP দিয়ে নিশ্চিত হয়। কখনো NID চাওয়া হবে না।' : 'Every pickup and delivery is confirmed with OTP. NID is never required.'}</p>
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
