import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ApprovalItem {
  id: string;
  type: 'event' | 'announcement';
  title: string;
  organizer: string;
  submitted_date: string;
  status: 'pending';
}

const MOCK_APPROVALS: ApprovalItem[] = [
  {
    id: 'app1',
    type: 'event',
    title: 'Science Fair 2026',
    organizer: 'Alice Johnson',
    submitted_date: new Date(Date.now() - 86400000).toISOString(),
    status: 'pending'
  },
  {
    id: 'app2',
    type: 'announcement',
    title: 'New Cafeteria Menu',
    organizer: 'Food Services',
    submitted_date: new Date(Date.now() - 172800000).toISOString(),
    status: 'pending'
  }
];

export function ApprovalInboxPage() {
  const [items, setItems] = useState<ApprovalItem[]>(MOCK_APPROVALS);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'revise' | null>(null);
  const [comment, setComment] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAction = (item: ApprovalItem, type: 'approve' | 'reject' | 'revise') => {
    setSelectedItem(item);
    setActionType(type);
    setIsModalOpen(true);
  };

  const confirmAction = () => {
    if (selectedItem) {
      setItems(items.filter(i => i.id !== selectedItem.id));
    }
    setIsModalOpen(false);
    setSelectedItem(null);
    setComment('');
    setActionType(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Approval Inbox</h1>
      
      {items.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">All caught up!</h2>
          <p className="text-gray-500">There are no pending items requiring your approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                    PENDING
                  </span>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {item.type}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500">
                  Submitted by {item.organizer} on {new Date(item.submitted_date).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleAction(item, 'approve')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  ✅ Approve
                </Button>
                <Button 
                  onClick={() => handleAction(item, 'revise')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  🔄 Revise
                </Button>
                <Button 
                  onClick={() => handleAction(item, 'reject')}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  ❌ Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {actionType === 'approve' && 'Confirm Approval'}
                {actionType === 'reject' && 'Confirm Rejection'}
                {actionType === 'revise' && 'Return for Revision'}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                You are about to {actionType} "{selectedItem?.title}". Would you like to add a comment?
              </p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add your review comments here..."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none h-24 resize-none"
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmAction}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                  actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 
                  actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 
                  'bg-yellow-500 hover:bg-yellow-600'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
