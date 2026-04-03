import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageSquare, Bug, Lightbulb, HelpCircle, Mail, Clock,
  Check, CheckCheck, Trash2, ChevronDown, ChevronUp, RefreshCw, Key
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const TYPE_CONFIG = {
  feedback: { icon: MessageSquare, label: 'Feedback', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  bug: { icon: Bug, label: 'Bug Report', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  feature_request: { icon: Lightbulb, label: 'Feature Request', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  question: { icon: HelpCircle, label: 'Question', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  key_request: { icon: Key, label: 'Key Request', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
};

const parseDate = (dateStr) => {
  if (!dateStr) return new Date();
  let d = dateStr;
  if (d.includes(' ') && !d.includes('T')) d = d.replace(' ', 'T');
  if (!d.endsWith('Z') && !d.includes('+') && !d.match(/-\d{2}:\d{2}$/)) {
    d += 'Z';
  }
  return new Date(d);
};

const formatCentralTime = (dateStr, isFull = false) => {
  try {
    const d = parseDate(dateStr);
    let formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      month: isFull ? 'long' : 'short',
      day: 'numeric',
      year: isFull ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(d);
    
    if (isFull) {
      formatted = formatted.replace(' at ', ', ').replace(', ', ' at ');
    }
    return formatted;
  } catch (e) {
    return String(dateStr);
  }
};

const STATUS_CONFIG = {
  unread: { label: 'Unread', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  read: { label: 'Read', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
};

export default function AdminInbox() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [notesMap, setNotesMap] = useState({});
  const [filter, setFilter] = useState('all'); // all, unread, read, resolved
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => { loadMessages(); }, []);

  const loadMessages = async () => {
    setLoading(true);
    const items = await base44.entities.Feedback.list('-created_date');
    setMessages(items);
    const nm = {};
    items.forEach(m => { nm[m.id] = m.admin_notes || ''; });
    setNotesMap(nm);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    await base44.entities.Feedback.update(id, { status });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    toast.success(`Marked as ${status}`);
  };

  const saveNotes = async (id) => {
    await base44.entities.Feedback.update(id, { admin_notes: notesMap[id] || '' });
    toast.success('Notes saved');
  };

  const deleteFeedback = async (id) => {
    await base44.entities.Feedback.delete(id);
    setMessages(prev => prev.filter(m => m.id !== id));
    if (expandedId === id) setExpandedId(null);
    toast.success('Deleted');
  };

  const toggleExpand = async (msg) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(msg.id);
    // Auto-mark as read when opened
    if (msg.status === 'unread') {
      updateStatus(msg.id, 'read');
    }
  };

  const filtered = filter === 'all' ? messages : messages.filter(m => m.status === filter);
  const unreadCount = messages.filter(m => m.status === 'unread').length;

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(m => m.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} messages?`)) return;
    for (const id of selectedIds) {
      await base44.entities.Feedback.delete(id);
    }
    setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
    setSelectedIds(new Set());
    toast.success('Deleted selected messages');
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Inbox
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-orange-600 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </h3>
          </div>
          {messages.length > 0 && (
            <div className="flex items-center gap-2 ml-2 border-l pl-4 dark:border-gray-200 dark:border-gray-800">
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              <span className="text-sm text-gray-500">Select All</span>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelected}
                  className="h-8 text-xs ml-2"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete ({selectedIds.size})
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {['all', 'unread', 'read', 'resolved'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? `All (${messages.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${messages.filter(m => m.status === f).length})`}
            </button>
          ))}
          <Button variant="ghost" size="icon" onClick={loadMessages} className="h-8 w-8">
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Messages list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          {filter === 'all' ? 'No feedback messages yet.' : `No ${filter} messages.`}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(msg => {
            const typeConf = TYPE_CONFIG[msg.type] || TYPE_CONFIG.feedback;
            const statusConf = STATUS_CONFIG[msg.status] || STATUS_CONFIG.unread;
            const isExpanded = expandedId === msg.id;
            const TypeIcon = typeConf.icon;

            return (
              <div
                key={msg.id}
                className={`bg-white dark:bg-gray-900 rounded-xl border transition-all ${
                  msg.status === 'unread'
                    ? 'border-orange-200 dark:border-orange-800/50'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                {/* Row header */}
                <button
                  onClick={() => toggleExpand(msg)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="flex items-center" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(msg.id)}
                      onChange={(e) => toggleSelect(msg.id, e)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2 cursor-pointer"
                    />
                  </div>
                  <div className={`p-2 rounded-lg ${typeConf.color}`}>
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-semibold truncate ${
                        msg.status === 'unread'
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {msg.subject}
                      </span>
                      {msg.status === 'unread' && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                      <span>{msg.name || 'Anonymous'}</span>
                      <span>·</span>
                      <span>{formatCentralTime(msg.created_date, false)}</span>
                    </div>
                  </div>
                  <Badge className={`${statusConf.color} text-xs flex-shrink-0`}>{statusConf.label}</Badge>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                        {/* Meta */}
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                          {msg.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {msg.email}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatCentralTime(msg.created_date, true)}
                          </span>
                          <Badge className={`${typeConf.color} text-xs`}>{typeConf.label}</Badge>
                        </div>

                        {/* Message body */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </div>

                        {/* Admin notes */}
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Admin Notes</label>
                          <Textarea
                            value={notesMap[msg.id] || ''}
                            onChange={e => setNotesMap(prev => ({ ...prev, [msg.id]: e.target.value }))}
                            placeholder="Internal notes..."
                            rows={2}
                            className="text-sm dark:bg-gray-800 dark:border-gray-700 resize-none"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveNotes(msg.id)}
                            className="mt-1 text-xs text-gray-500"
                          >
                            Save Notes
                          </Button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          {msg.status !== 'read' && msg.status !== 'resolved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatus(msg.id, 'read')}
                              className="text-xs dark:border-gray-700"
                            >
                              <Check className="w-3 h-3 mr-1" /> Mark Read
                            </Button>
                          )}
                          {msg.status !== 'resolved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatus(msg.id, 'resolved')}
                              className="text-xs text-green-600 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
                            >
                              <CheckCheck className="w-3 h-3 mr-1" /> Resolve
                            </Button>
                          )}
                          {msg.email && (
                            <a
                              href={`mailto:${msg.email}?subject=Re: ${msg.subject}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <Mail className="w-3 h-3" /> Reply
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFeedback(msg.id)}
                            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto"
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}