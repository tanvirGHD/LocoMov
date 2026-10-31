import { useCallback, useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const dhaka = [23.8103, 90.4126];
const taskIcon = L.divIcon({ className: 'map-marker-wrap', html: '<span class="map-marker"><i></i></span>', iconSize: [26, 34], iconAnchor: [13, 30] });
const pinIcon = L.divIcon({ className: 'map-marker-wrap', html: '<span class="map-marker"><i></i></span>', iconSize: [26, 34], iconAnchor: [13, 30] });

const statusNames = {
  pending: 'রানার খুঁজছে',
  accepted: 'রানার পেয়েছে',
  'picked-up': 'পার্সেল পেয়েছে',
  'in-transit': 'রানার পথে আছে',
  arriving: 'কাছাকাছি পৌঁছাচ্ছে',
  completed: 'ডেলিভার হয়েছে',
  cancelled: 'বাতিল',
};
const deliveryStages = [
  { status: 'picked-up', label: 'পার্সেল পেয়েছে' },
  { status: 'in-transit', label: 'রওনা হয়েছে' },
  { status: 'arriving', label: 'কাছাকাছি' },
  { status: 'completed', label: 'ডেলিভার হয়েছে' },
];

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

function LocationFields({ prefix, label, values, onChange, selectedPosition, onSelectPosition, onNotice }) {
  const [expanded, setExpanded] = useState(false);
  const [largeView, setLargeView] = useState(false);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      onNotice('এই ব্রাউজারে অবস্থান সুবিধা নেই');
      return;
    }
    navigator.geolocation.getCurrentPosition(({ coords: point }) => {
      onSelectPosition([point.latitude, point.longitude]);
      setExpanded(true);
      onNotice('');
    }, () => onNotice('অবস্থান ব্যবহারের অনুমতি পাওয়া যায়নি'));
  }

  return (
    <div className={`location-picker ${expanded ? 'location-picker-expanded' : ''}`}>
      <label>{label} ঠিকানা<input required minLength="3" maxLength="240" placeholder="বাড়ি, রাস্তা, এলাকা" value={values[`${prefix}Address`]} onChange={(event) => onChange(`${prefix}Address`, event.target.value)} /></label>
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

function StatCard({ icon, label, value, tone = '' }) {
  const displayValue = typeof value === 'number' ? value.toLocaleString('bn-BD') : value || '০';
  return <article className={`stat-card ${tone}`}><span className="stat-icon">{icon}</span><div><span>{label}</span><b>{displayValue}</b></div></article>;
}

function TaskCard({ task, user, onRefresh, onError, bids, setBids, runnerPosition, loadNearby }) {
  const [otp, setOtp] = useState('');
  const [bidForm, setBidForm] = useState({ proposedPrice: task.estimatedPrice, deliveryTime: 30 });
  const [loading, setLoading] = useState(false);
  const [bidLoading, setBidLoading] = useState(false);
  const [showBids, setShowBids] = useState(false);
  const isRunner = user.role === 'runner';
  const isAdmin = user.role === 'admin';
  const canCancel = ['pending', 'accepted'].includes(task.status);
  const canDeletePost = user.role === 'customer' &&
    String(task.customerId?._id || task.customerId) === String(user.id) &&
    task.status === 'pending' &&
    !task.runnerId;
  const pickup = coordinates(task.pickupLocation);
  const delivery = coordinates(task.deliveryLocation);

  async function act(action) {
    if (action === 'delete' && !window.confirm('এই কাজের পোস্টটি স্থায়ীভাবে মুছে ফেলবেন?')) return;
    setLoading(true);
    onError('');
    try {
      if (action === 'accept') {
        if (!runnerPosition) throw new Error('কাজ নিতে আগে আপনার অবস্থান শেয়ার করুন');
        await api.acceptTask(task._id, { latitude: runnerPosition[0], longitude: runnerPosition[1] });
      } else if (action === 'pickup') {
        await api.verifyPickup(task._id, otp);
      } else if (action === 'delivery') {
        await api.verifyDelivery(task._id, otp);
      } else if (action === 'depart' || action === 'arriving') {
        await api.updateDeliveryStatus(task._id, action === 'depart' ? 'in-transit' : 'arriving');
      } else if (action === 'cancel') {
        await api.cancelTask(task._id, 'ব্যবহারকারীর অনুরোধে বাতিল');
      } else if (action === 'delete') {
        await api.deleteTask(task._id);
      } else if (action === 'dispute') {
        const reason = window.prompt('সমস্যার বিস্তারিত লিখুন (অন্তত ১০ অক্ষর)');
        if (!reason) return;
        await api.reportDispute(task._id, reason);
      }
      if (action === 'pickup' || action === 'delivery') setOtp('');
      await onRefresh();
      if (action === 'delete') onError('আপনার কাজের পোস্টটি মুছে ফেলা হয়েছে।');
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
      if (!runnerPosition) throw new Error('প্রস্তাব দিতে আগে আপনার অবস্থান শেয়ার করুন');
      await api.createBid(task._id, {
        proposedPrice: Number(bidForm.proposedPrice),
        deliveryTime: Number(bidForm.deliveryTime),
      }, { latitude: runnerPosition[0], longitude: runnerPosition[1] });
      onError('আপনার প্রস্তাবটি পাঠানো হয়েছে।');
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
    const resolution = window.prompt('সমাধানের বিবরণ লিখুন');
    if (!resolution) return;
    const faultChoice = window.prompt('দায় কার? রানার হলে ১, গ্রাহক হলে ২, কেউ নয় হলে ০ লিখুন', '০')?.trim();
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
      onError('দায়ের ধরন সঠিকভাবে নির্বাচন করুন');
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
    <article className="task-card">
      <div className="task-card-top">
        <span className={`status-pill status-${task.status}`}>{statusNames[task.status] || task.status}</span>
        <span className="task-date">{new Date(task.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}</span>
      </div>
      <h3>{task.title}</h3>
      <p className="task-description">{task.description}</p>
      <div className="task-route">
        <span className="route-point route-start" /><div><small>পিকআপ</small><b>{task.pickupAddress || task.pickupLocation?.address || 'ঠিকানা দেওয়া হয়নি'}</b></div>
        <span className="route-dash" />
        <span className="route-point route-end" /><div><small>ডেলিভারি</small><b>{task.deliveryAddress || task.deliveryLocation?.address || 'ঠিকানা দেওয়া হয়নি'}</b></div>
      </div>
      <div className="task-meta">
        <div><small>বাজেট</small><b>{money(task.finalPrice ?? task.estimatedPrice)}</b></div>
        <div><small>{isRunner ? 'গ্রাহক' : 'রানার'}</small><b>{isRunner ? task.customerId?.name || 'স্থানীয় গ্রাহক' : task.runnerId?.name || 'এখনও পাওয়া যায়নি'}</b></div>
        {task.disputeStatus === 'open' && <span className="dispute-pill">সমস্যা খোলা</span>}
      </div>
      {['accepted', 'picked-up', 'in-transit', 'arriving', 'completed'].includes(task.status) && <ol className="delivery-progress" aria-label="ডেলিভারির অগ্রগতি">
        {deliveryStages.map((stage, index) => {
          const currentIndex = deliveryStages.findIndex((item) => item.status === task.status);
          const complete = currentIndex >= index;
          return <li key={stage.status} className={`${complete ? 'stage-complete' : ''} ${task.status === stage.status ? 'stage-current' : ''}`}>
            <span className="stage-marker">{complete ? '✓' : index + 1}</span><small>{stage.label}</small>
          </li>;
        })}
      </ol>}
      {user.role === 'customer' && ['accepted', 'picked-up', 'in-transit', 'arriving'].includes(task.status) && (task.pickupOTP || task.deliveryOTP) &&
        <div className="customer-otp"><span>রানারকে নিরাপদে দিন</span><b>পিকআপ OTP: {task.pickupOTP} <i>·</i> ডেলিভারি OTP: {task.deliveryOTP}</b></div>}
      {isRunner && task.status === 'accepted' && <form className="otp-form" onSubmit={(event) => { event.preventDefault(); act('pickup'); }}>
        <label>পিকআপের সময় গ্রাহকের OTP<input inputMode="numeric" maxLength="4" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="৪ সংখ্যার OTP" required /></label>
        <button className="button button-primary button-small" disabled={loading}>{loading ? 'যাচাই হচ্ছে...' : 'পিকআপ নিশ্চিত'}</button>
      </form>}
      {isRunner && task.status === 'picked-up' && <div className="runner-stage-action">
        <p>পার্সেলটি পেয়েছেন? যাত্রা শুরু করলে অবস্থা আপডেট করুন।</p>
        <button className="button button-primary button-small" onClick={() => act('depart')} disabled={loading}>{loading ? 'আপডেট হচ্ছে...' : 'রওনা হয়েছি'}</button>
      </div>}
      {isRunner && task.status === 'in-transit' && <div className="runner-stage-action">
        <p>গন্তব্যের কাছাকাছি পৌঁছালে গ্রাহককে জানান।</p>
        <button className="button button-primary button-small" onClick={() => act('arriving')} disabled={loading}>{loading ? 'আপডেট হচ্ছে...' : 'কাছাকাছি পৌঁছেছি'}</button>
      </div>}
      {isRunner && task.status === 'arriving' && <form className="otp-form" onSubmit={(event) => { event.preventDefault(); act('delivery'); }}>
        <label>প্রাপকের ডেলিভারি OTP<input inputMode="numeric" maxLength="4" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="৪ সংখ্যার OTP" required /></label>
        <button className="button button-primary button-small" disabled={loading}>{loading ? 'যাচাই হচ্ছে...' : 'ডেলিভারি নিশ্চিত'}</button>
      </form>}
      {task.disputeStatus === 'open' && isAdmin && <button className="button button-primary button-small" onClick={resolve}>সমস্যার সমাধান</button>}
      {task.disputeStatus === 'open' && <p className="dispute-reason">বিবরণ: {task.disputeReason}</p>}
      {task.status === 'pending' && isRunner && <div className="runner-task-actions">
        <button className="button button-primary button-small" onClick={() => act('accept')} disabled={loading}>{loading ? 'অপেক্ষা করুন...' : 'কাজটি নিন'}</button>
        <form className="bid-form" onSubmit={sendBid}>
          <label>প্রস্তাব ৳<input type="number" min="1" max={Math.min(user.runnerLimit, task.estimatedPrice)} value={bidForm.proposedPrice} onChange={(event) => setBidForm({ ...bidForm, proposedPrice: event.target.value })} required /></label>
          <label>মিনিট<input type="number" min="1" max="10080" value={bidForm.deliveryTime} onChange={(event) => setBidForm({ ...bidForm, deliveryTime: event.target.value })} required /></label>
          <button className="button button-outline button-small" disabled={bidLoading}>{bidLoading ? 'পাঠানো হচ্ছে...' : 'প্রস্তাব দিন'}</button>
        </form>
      </div>}
      {task.status === 'pending' && user.role === 'customer' && <button className="text-button" onClick={loadBids}>{showBids ? 'প্রস্তাব লুকান' : 'রানারদের প্রস্তাব দেখুন'} <span>({bids[task._id]?.length || '—'})</span></button>}
      {showBids && user.role === 'customer' && <div className="bid-list">
        {(bids[task._id] || []).length === 0 ? <p>এখনও কোনো প্রস্তাব আসেনি।</p> : (bids[task._id] || []).map((bid) => <div className="bid-row" key={bid._id}>
          <span className="runner-avatar small-avatar">{bid.runnerId?.name?.slice(0, 1) || 'র'}</span>
          <div><b>{bid.runnerId?.name || 'রানার'}</b><small>বিশ্বাস স্কোর {Number(bid.runnerId?.trustScore || 100).toLocaleString('bn-BD')} · {bid.deliveryTime.toLocaleString('bn-BD')} মিনিট</small></div>
          <strong>{money(bid.proposedPrice)}</strong>
          <button className="button button-primary button-small" onClick={() => chooseBid(bid._id)} disabled={loading || bid.status !== 'pending'}>{bid.status === 'accepted' ? 'নির্বাচিত' : bid.status === 'rejected' ? 'প্রত্যাখ্যাত' : 'গ্রহণ'}</button>
        </div>)}
      </div>}
      {((canCancel && (user.role === 'admin' || (user.role === 'customer' && String(task.customerId?._id || task.customerId) === String(user.id)) || (isRunner && String(task.runnerId?._id || task.runnerId) === String(user.id)))) || canDeletePost) ?
        <div className="task-footer-actions">
          {canCancel && <button className="text-button text-danger" onClick={() => act('cancel')} disabled={loading}>কাজ বাতিল</button>}
          {canDeletePost && <button className="text-button text-danger" onClick={() => act('delete')} disabled={loading}>{loading ? 'মুছছে...' : 'পোস্ট মুছুন'}</button>}
          {task.status !== 'pending' && <button className="text-button" onClick={() => act('dispute')} disabled={loading}>সমস্যা জানান</button>}
        </div> : null}
      {task.status === 'completed' && task.disputeStatus !== 'open' && <button className="text-button" onClick={() => act('dispute')}>সমস্যা জানান</button>}
      {pickup && delivery && <span className="sr-only">পিকআপ ও ডেলিভারি স্থান মানচিত্রে দেখানো হয়েছে।</span>}
    </article>
  );
}

export default function Home() {
  const { user, refreshUser } = useAuth();
  const [dashboard, setDashboard] = useState({ stats: {}, activity: [], recentTasks: [] });
  const [tasks, setTasks] = useState([]);
  const [nearbyTasks, setNearbyTasks] = useState([]);
  const [runnerPosition, setRunnerPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [bids, setBids] = useState({});
  const [adminUsers, setAdminUsers] = useState([]);
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
      setNotice('এই ব্রাউজারে অবস্থান সুবিধা নেই');
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
      setNotice('কাছের কাজ দেখতে ব্রাউজারে অবস্থান ব্যবহারের অনুমতি দিন');
      setLocationLoading(false);
    }, { enableHighAccuracy: true, timeout: 12000 });
  };

  const currentCenter = useMemo(() => runnerPosition || dhaka, [runnerPosition]);
  const visibleTasks = user.role === 'runner'
    ? [...tasks, ...nearbyTasks.filter((nearbyTask) => !tasks.some((assignedTask) => assignedTask._id === nearbyTask._id))]
    : tasks;
  const openDisputes = tasks.filter((task) => task.disputeStatus === 'open');

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const refreshAll = async () => {
    await load();
    if (user.role === 'runner') await refreshNearby();
  };

  async function submitTask(event) {
    event.preventDefault();
    if (!form.pickupPosition || !form.deliveryPosition) {
      setNotice('কাজ পোস্ট করার আগে পিকআপ ও ডেলিভারির স্থান মানচিত্রে বাছাই করুন।');
      return;
    }

    async function toggleUserStatus(targetUser) {
      const nextStatus = !targetUser.isActive;
      try {
        await api.setUserStatus(targetUser._id, nextStatus);
        setAdminUsers((current) => current.map((item) => item._id === targetUser._id ? { ...item, isActive: nextStatus } : item));
      } catch (error) {
        setNotice(error.message);
      }
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
      <section className="dashboard-welcome">
        <div><div className="eyebrow"><span className="eyebrow-dot" />{user.role === 'runner' ? 'আপনার পরের পথে' : user.role === 'admin' ? 'কমিউনিটি পরিচালনা' : 'আপনার পাড়ার নেটওয়ার্ক'}</div>
          <h1>{user.role === 'runner' ? `স্বাগতম, ${user.name.split(' ')[0]}` : user.role === 'admin' ? 'কমিউনিটি ড্যাশবোর্ড' : `কী কাজে সাহায্য লাগবে, ${user.name.split(' ')[0]}?`}</h1>
          <p>{user.role === 'runner' ? 'কাছাকাছি একটি কাজ নিন, পথে থেকেই বাড়তি উপার্জন করুন।' : user.role === 'admin' ? 'সাম্প্রতিক কাজ ও কমিউনিটির নিরাপত্তা দেখুন।' : 'একটি স্থানীয় কাজ পোস্ট করুন, অথবা আপনার চলমান কাজের অবস্থা দেখুন।'}</p>
        </div>
        <div className="profile-chip"><span className="profile-avatar">{user.name.slice(0, 1).toUpperCase()}</span><div><b>{user.name}</b><small>{user.role === 'runner' ? 'রানার' : user.role === 'admin' ? 'প্রশাসক' : 'গ্রাহক'}</small></div></div>
      </section>

      {notice && <div className={notice.includes('পোস্ট হয়েছে') || notice.includes('পাঠানো হয়েছে') ? 'notice notice-success' : 'notice'} role="status">{notice}<button onClick={() => setNotice('')} aria-label="বার্তা বন্ধ করুন">×</button></div>}

      <section className="stats-grid dashboard-stats">
        <StatCard icon="▣" label="মোট কাজ" value={dashboard.stats.total} />
        <StatCard icon="◷" label="অপেক্ষমাণ" value={dashboard.stats.pending} tone="stat-amber" />
        <StatCard icon="⌁" label="চলমান কাজ" value={dashboard.stats.active} tone="stat-blue" />
        <StatCard icon="✓" label="সম্পন্ন কাজ" value={dashboard.stats.completed} tone="stat-green" />
        {user.role === 'runner' && <StatCard icon="✦" label="বিশ্বাস স্কোর" value={user.trustScore} tone="stat-green" />}
        {user.role === 'runner' && <StatCard icon="৳" label="কাজের সীমা" value={money(user.runnerLimit)} tone="stat-blue" />}
      </section>

      {user.role === 'admin' && <section className="panel admin-users-panel">
        <div className="panel-heading">
          <div><span className="panel-kicker">নিরাপদ কমিউনিটি</span><h2>ব্যবহারকারী পরিচালনা <span className="admin-user-count">{adminUsers.length.toLocaleString('bn-BD')}</span></h2></div>
          <span className="panel-icon">♙</span>
        </div>
        {adminUsers.length === 0 ? <p className="admin-empty">এখনও কোনো ব্যবহারকারী নিবন্ধন করেননি।</p> : <div className="admin-users-list">
          {adminUsers.map((member) => <article className="admin-user-row" key={member._id}>
            <span className="admin-user-avatar">{member.name.slice(0, 1).toUpperCase()}</span>
            <div className="admin-user-details">
              <b>{member.name}</b>
              <span>{member.email}</span>
            </div>
            <span className={`admin-role-badge role-${member.role}`}>{member.role === 'runner' ? 'রানার' : member.role === 'admin' ? 'অ্যাডমিন' : 'গ্রাহক'}</span>
            <span className={`admin-account-status ${member.isActive ? 'active' : 'inactive'}`}>{member.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span>
            {member.role !== 'admin' && <button className="button button-outline button-small" onClick={() => toggleUserStatus(member)}>
              {member.isActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
            </button>}
          </article>)}
        </div>}
      </section>}

      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="panel-heading"><div><span className="panel-kicker">সাপ্তাহিক চিত্র</span><h2>কাজের অগ্রগতি</h2></div><span className="panel-icon">↗</span></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.activity} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#e9eee9" vertical={false} strokeDasharray="3 5" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })} tickLine={false} axisLine={false} tick={{ fill: '#8a958e', fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#8a958e', fontSize: 11 }} />
                <Tooltip labelFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString('bn-BD')} formatter={(value) => [`${value}টি`, 'কাজ']} />
                <Bar dataKey="count" fill="#984826" radius={[6, 6, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel map-panel">
          <div className="panel-heading"><div><span className="panel-kicker">স্থানীয় নেটওয়ার্ক</span><h2>কাছাকাছি কাজের মানচিত্র</h2></div>
            {user.role === 'runner' && <button className="button button-outline button-small" onClick={locateRunner} disabled={locationLoading}>{locationLoading ? 'খুঁজছি...' : runnerPosition ? 'আবার খুঁজুন' : 'আমার অবস্থান'}</button>}
          </div>
          <TaskMap tasks={visibleTasks} center={currentCenter} radius={user.role === 'runner' && !!runnerPosition} />
        </section>
      </div>

      {user.role === 'customer' && <section className="panel create-task-panel">
        <div className="panel-heading"><div><span className="panel-kicker">কয়েক মিনিটেই তৈরি</span><h2>নতুন কাজ পোস্ট করুন</h2></div><span className="panel-icon">＋</span></div>
        <form onSubmit={submitTask} className="task-create-form">
          <div className="form-row">
            <label>কাজের শিরোনাম<input required minLength="3" maxLength="120" placeholder="যেমন: ফার্মেসি থেকে ওষুধ আনুন" value={form.title} onChange={(event) => updateForm('title', event.target.value)} /></label>
            <label>আনুমানিক বাজেট (টাকা)<input required type="number" min="1" max="500000" step="1" placeholder="২৫০" value={form.estimatedPrice} onChange={(event) => updateForm('estimatedPrice', event.target.value)} /></label>
          </div>
          <label>কাজের বিস্তারিত<textarea required minLength="5" maxLength="2000" rows="3" placeholder="কোন ওষুধ বা জিনিস, কোনো বিশেষ নির্দেশনা থাকলে লিখুন..." value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></label>
          <div className="location-form-grid">
            <LocationFields prefix="pickup" label="পিকআপের" values={form} onChange={updateForm} selectedPosition={form.pickupPosition} onSelectPosition={(position) => updateForm('pickupPosition', position)} onNotice={setNotice} />
            <LocationFields prefix="delivery" label="ডেলিভারির" values={form} onChange={updateForm} selectedPosition={form.deliveryPosition} onSelectPosition={(position) => updateForm('deliveryPosition', position)} onNotice={setNotice} />
          </div>
          <div className="form-submit-row"><span>আপনার সঠিক স্থান রানারের কাছে কাজটি পৌঁছাতে সাহায্য করবে।</span><button className="button button-primary" disabled={submitting}>{submitting ? 'পোস্ট হচ্ছে...' : 'কাজ পোস্ট করুন'} <span aria-hidden="true">→</span></button></div>
        </form>
      </section>}

      {user.role === 'runner' && <section className="runner-location-banner">
        <span className="runner-banner-icon">⌖</span><div><b>আপনার কাছের কাজ দেখতে চান?</b><p>আপনার অবস্থান ব্যবহার করুন—শুধু ৫ কিমির মধ্যে এবং আপনার সীমার বাজেটের কাজ দেখানো হবে।</p></div>
        <button className="button button-primary" onClick={locateRunner} disabled={locationLoading}>{locationLoading ? 'অবস্থান খুঁজছি...' : runnerPosition ? 'কাজ খুঁজুন' : 'অবস্থান শেয়ার করুন'}</button>
      </section>}

      <section className="tasks-section">
        <div className="panel-heading tasks-heading"><div><span className="panel-kicker">{user.role === 'runner' ? 'আপনার রুটে' : 'আপনার কাজগুলো'}</span><h2>{user.role === 'runner' ? 'আমার ও কাছের কাজ' : user.role === 'admin' ? 'সাম্প্রতিক কাজ' : 'আমার কাজ'}</h2></div>
          <button className="button button-outline button-small" onClick={() => { load(); refreshNearby(); }} disabled={loading}>{loading ? 'লোড হচ্ছে...' : '↻ হালনাগাদ'}</button>
        </div>
        {user.role === 'admin' && openDisputes.length > 0 && <div className="admin-alert">⚑ {openDisputes.length.toLocaleString('bn-BD')}টি খোলা সমস্যা—নিচের কাজগুলো পর্যালোচনা করুন।</div>}
        {user.role === 'runner' && !runnerPosition && nearbyTasks.length === 0 && <div className="empty-state"><span>⌖</span><h3>কাছের কাজ দেখতে অবস্থান দিন</h3><p>আপনার তথ্য শেয়ার করা হবে না; শুধু কাছের খোলা কাজ খুঁজতেই এটি ব্যবহার হয়।</p><button className="button button-primary" onClick={locateRunner}>আমার কাছের কাজ দেখান</button></div>}
        {user.role === 'runner' && runnerPosition && nearbyTasks.length === 0 && tasks.length === 0 && <div className="empty-state"><span>⌁</span><h3>এখনও কোনো কাজ মেলেনি</h3><p>নতুন কাজ এলে আবার খুঁজুন। আপনার কাজের সীমা ৳{Number(user.runnerLimit).toLocaleString('bn-BD')} পর্যন্ত।</p><button className="button button-outline" onClick={() => refreshNearby()}>আবার খুঁজুন</button></div>}
        {user.role !== 'runner' && tasks.length === 0 && !loading && <div className="empty-state"><span>✳</span><h3>{user.role === 'admin' ? 'এখনও কোনো কাজ নেই' : 'এখনও কোনো কাজ পোস্ট করেননি'}</h3><p>{user.role === 'customer' ? 'উপরে ফর্মটি পূরণ করে আপনার প্রথম কাজটি পোস্ট করুন।' : 'কমিউনিটিতে কাজ শুরু হলে এখানে দেখা যাবে।'}</p></div>}
        <div className="task-list">
          {visibleTasks.map((task) => <TaskCard key={task._id} task={task} user={user} onRefresh={refreshAll} onError={setNotice} bids={bids} setBids={setBids} runnerPosition={runnerPosition} loadNearby={refreshNearby} />)}
        </div>
      </section>
      <p className="safety-note"><span>♧</span> প্রতিটি পিকআপ ও ডেলিভারি OTP দিয়ে নিশ্চিত হয়। কখনো NID চাওয়া হবে না।</p>
    </div>
  );
}
