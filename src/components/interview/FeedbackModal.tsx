import { useState } from 'react';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    interviewId: string;
}

export default function FeedbackModal({ isOpen, onClose, interviewId }: FeedbackModalProps) {
    const [rating, setRating] = useState<number>(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = () => {
        trackEvent(AnalyticsEvents.FEEDBACK_SUBMITTED, {
            interview_id: interviewId,
            rating,
            comment_length: comment.length,
            has_comment: comment.length > 0
        });
        setSubmitted(true);
        setTimeout(onClose, 2000); // Close after showing success message
    };

    if (submitted) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Thank you!</h3>
                    <p className="text-slate-600">Your feedback helps us improve.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">How was this session?</h3>
                <p className="text-slate-600 text-center mb-6">Rate the quality of the AI's feedback.</p>

                {/* Stars */}
                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            className={`text-3xl transition-transform hover:scale-110 ${rating >= star ? 'text-amber-400' : 'text-slate-200'}`}
                        >
                            ★
                        </button>
                    ))}
                </div>

                {/* Comment */}
                <textarea
                    className="w-full p-3 border border-slate-200 rounded-xl mb-6 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                    placeholder="Any specific feedback? (Optional)"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl text-slate-500 font-medium hover:bg-slate-50 transition-colors"
                    >
                        Skip
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={rating === 0}
                        className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
}
