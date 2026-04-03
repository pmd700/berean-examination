import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Mail, MessageSquare, Bug, Lightbulb, HelpCircle, CheckCircle2, Copy, Check, Key } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

const CONTACT_EMAIL = 'simonbarjona@atomicmail.io';

const FEEDBACK_TYPES = [
  { value: 'feedback', label: 'General Feedback', icon: MessageSquare, color: 'text-orange-500' },
  { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500' },
  { value: 'feature_request', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-500' },
  { value: 'question', label: 'Question', icon: HelpCircle, color: 'text-blue-500' },
  { value: 'key_request', label: 'Key Request', icon: Key, color: 'text-yellow-500' },
];

export default function ContactFeedback() {
  const [user, setUser] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const [form, setForm] = useState({
    type: 'feedback',
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        setForm(prev => ({
          ...prev,
          name: u.display_name || u.full_name || '',
          email: u.email || '',
        }));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', user?.theme === 'dark');
  }, [user?.theme]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error('Please fill in the subject and message');
      return;
    }
    setSending(true);
    await base44.entities.Feedback.create({
      type: form.type,
      name: form.name,
      email: form.email,
      subject: form.subject,
      message: form.message,
    });
    setSending(false);
    setSent(true);
    toast.success('Feedback sent! Thank you.');
  };

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(CONTACT_EMAIL);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const resetForm = () => {
    setForm(prev => ({ ...prev, subject: '', message: '', type: 'feedback' }));
    setSent(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-orange-400/[0.07] dark:bg-orange-500/[0.04] rounded-full blur-[100px]" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] bg-amber-400/[0.06] dark:bg-amber-500/[0.03] rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 left-1/3 w-[450px] h-[450px] bg-rose-400/[0.05] dark:bg-rose-500/[0.025] rounded-full blur-[120px]" />
        {/* Subtle mesh texture */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-6 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Get in Touch
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            I'd love to hear from you — whether it's feedback, a bug, or just a question.
          </p>
        </div>

        {/* Feedback form */}
        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center shadow-sm mb-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
            >
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Thank You!</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Your feedback has been received and will be reviewed soon.
            </p>
            <Button onClick={resetForm} variant="outline" className="dark:border-gray-700">
              Send Another
            </Button>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm space-y-5 mb-8"
          >
            {/* Type selector */}
            <div>
              <Label className="text-gray-700 dark:text-gray-300 text-sm mb-2 block">What kind of message?</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {FEEDBACK_TYPES.map(ft => (
                  <button
                    type="button"
                    key={ft.value}
                    onClick={() => setForm(prev => ({ ...prev, type: ft.value }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                      form.type === ft.value
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                        : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <ft.icon className={`w-5 h-5 ${form.type === ft.value ? ft.color : ''}`} />
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Name & Email row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300 text-sm mb-1.5 block">Your Name</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Name"
                  className="dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300 text-sm mb-1.5 block">Email</Label>
                <Input
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <Label className="text-gray-700 dark:text-gray-300 text-sm mb-1.5 block">Subject *</Label>
              <Input
                value={form.subject}
                onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Brief subject line"
                required
                className="dark:bg-gray-800 dark:border-gray-700"
              />
            </div>

            {/* Message */}
            <div>
              <Label className="text-gray-700 dark:text-gray-300 text-sm mb-1.5 block">Message *</Label>
              <Textarea
                value={form.message}
                onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Describe your feedback, bug, or question in detail..."
                required
                rows={5}
                className="dark:bg-gray-800 dark:border-gray-700 resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={sending}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white h-11"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Send Feedback
                </span>
              )}
            </Button>
          </motion.form>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">or reach out directly</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
        </div>

        {/* Direct contact section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm text-center"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Email Me Directly</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">I typically respond within 24–48 hours</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-xl px-5 py-3 mb-5">
            <Mail className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="font-mono text-sm text-gray-800 dark:text-gray-200 select-all">
              {CONTACT_EMAIL}
            </span>
            <button
              onClick={handleCopyEmail}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {copiedEmail ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>

          <div>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-colors shadow-md hover:shadow-lg"
            >
              <Mail className="w-4 h-4" />
              Open Email Client
            </a>
          </div>
        </motion.div>
      </div>
      <Toaster />
    </div>
  );
}