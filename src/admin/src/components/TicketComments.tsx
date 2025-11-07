import React from "react";

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  isInternal: boolean;
}

interface TicketCommentsProps {
  comments?: Comment[];
  newComment: string;
  isInternal: boolean;
  onCommentChange: (value: string) => void;
  onInternalChange: (value: boolean) => void;
  onAddComment: () => void;
  formatDate: (dateString: string) => string;
}

export const TicketComments: React.FC<TicketCommentsProps> = ({
  comments,
  newComment,
  isInternal,
  onCommentChange,
  onInternalChange,
  onAddComment,
  formatDate,
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
      </div>

      <div className="px-6 py-4">
        {comments && comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-lg p-4 ${
                  comment.isInternal
                    ? "border-l-4 border-blue-400 bg-blue-50"
                    : "bg-gray-50"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {comment.author}
                    </span>
                    {comment.isInternal && (
                      <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        Internal
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(comment.timestamp)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-700">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No comments yet.</p>
        )}

        {/* Add Comment Form */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Add Comment
              </label>
              <textarea
                value={newComment}
                onChange={(e) => onCommentChange(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                placeholder="Add a comment..."
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => onInternalChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Internal comment (not visible to user)
                </span>
              </label>

              <button
                onClick={onAddComment}
                disabled={!newComment.trim()}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

