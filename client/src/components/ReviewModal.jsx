import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { api } from '../api';

export default function ReviewModal({ task, language, open, onClose, onSubmitted }) {
  const isBn = language === 'bn';
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open || !task) return null;

  const runnerName = task.runnerId?.name || (isBn ? 'রানার' : 'runner');

  async function submit(event) {
    event.preventDefault();
    if (rating < 1) {
      setError(isBn ? '১ থেকে ৫ তারকা দিন।' : 'Please choose a rating from 1 to 5.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await api.submitReview(task._id, { rating, comment: comment.trim() });
      onSubmitted?.(result);
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="confirm-overlay" role="presentation" onClick={onClose}>
      <form className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <header className="review-modal-header">
          <div>
            <h3 id="review-title">{isBn ? 'রানারকে রেটিং দিন' : 'Rate your runner'}</h3>
            <p>{isBn ? `${runnerName}-কে এই কাজের জন্য মূল্যায়ন করুন।` : `How was ${runnerName} on this job?`}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={isBn ? 'বন্ধ' : 'Close'}><X size={16} /></button>
        </header>
        <div className="star-row" role="radiogroup" aria-label={isBn ? 'রেটিং' : 'Rating'}>
          {[1, 2, 3, 4, 5].map((value) => {
            const active = (hover || rating) >= value;
            return (
              <button
                key={value}
                type="button"
                className={`star-button ${active ? 'active' : ''}`}
                aria-label={`${value}`}
                onMouseEnter={() => setHover(value)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(value)}
              >
                <Star size={28} fill={active ? 'currentColor' : 'none'} />
              </button>
            );
          })}
        </div>
        <label>{isBn ? 'মন্তব্য (ঐচ্ছিক)' : 'Comment (optional)'}
          <textarea value={comment} maxLength={1000} rows={3} onChange={(event) => setComment(event.target.value)} placeholder={isBn ? 'কাজটি কেমন হলো লিখুন' : 'Share a short comment'} />
        </label>
        {error && <p className="chat-error">{error}</p>}
        <div className="confirm-actions">
          <button type="button" className="button button-outline" onClick={onClose}>{isBn ? 'পরে' : 'Later'}</button>
          <button type="submit" className="button button-primary" disabled={submitting || rating < 1}>{submitting ? (isBn ? 'পাঠানো হচ্ছে...' : 'Submitting...') : (isBn ? 'রেটিং জমা দিন' : 'Submit review')}</button>
        </div>
      </form>
    </div>
  );
}
