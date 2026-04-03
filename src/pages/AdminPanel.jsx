import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Key, Plus, Trash2, Pause, Play, Ban, Copy, Check, X,
  Shield, BookOpen, Moon, Sun, Search, RefreshCw, ArrowLeft, Bug, Eye, EyeOff, ChevronDown, Megaphone, Inbox, MapPin, Database
} from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { generateAccessKey } from '../components/utils/bibleData';
import { LoadingScreen, LoadingSpinner } from '../components/ui/loading-screen';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Breadcrumbs from '../components/navigation/Breadcrumbs';
import UpdatePusherForm from '../components/updates/UpdatePusherForm';
import AdminInbox from '../components/admin/AdminInbox';
import BiblicalLocationsManager from '../components/admin/BiblicalLocationsManager';
import BiblicalGeographyDataSourcesManager from '../components/admin/BiblicalGeographyDataSourcesManager';
import { trackActivity } from '../components/utils/activityTracker';

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState([]);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [confirmAction, setConfirmAction] = useState(null);
  const [revealedKeys, setRevealedKeys] = useState(new Set());
  const [activeView, setActiveView] = useState('keys'); // 'keys', 'updates', 'inbox', 'places', or 'geo_sources'

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    // Animate stat numbers on mount
    if (!loading && keys.length > 0) {
      const cards = document.querySelectorAll('.stat-number');
      cards.forEach((card) => {
        const target = parseInt(card.getAttribute('data-value') || '0');
        let current = 0;
        const increment = target / 30;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            card.textContent = target.toString();
            clearInterval(timer);
          } else {
            card.textContent = Math.floor(current).toString();
          }
        }, 16);
      });
    }
  }, [keys, loading]);

  const checkAdminAccess = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      // SECURITY: Block users who authenticated but never completed key validation
      if (!currentUser?.access_key) {
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }
      
      // SECURITY: Verify key is still valid
      const keys = await base44.entities.AccessKey.filter({ key: currentUser.access_key });
      if (keys.length === 0) {
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }
      
      const userKey = keys[0];
      if (userKey.status === 'paused' || userKey.status === 'revoked' || userKey.status === 'deleted') {
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }
      
      if (!currentUser?.is_admin) {
        window.location.href = createPageUrl('Study');
        return;
      }
      
      setUser(currentUser);
      setTheme(currentUser.theme || 'dark');
      await loadKeys();

      // Restore view from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');
      if (viewParam === 'updates') setActiveView('updates');
      if (viewParam === 'inbox') setActiveView('inbox');
      if (viewParam === 'places') setActiveView('places');
      if (viewParam === 'geo_sources') setActiveView('geo_sources');
    } catch (e) {
      window.location.href = createPageUrl('KeyEntry');
    }
    setLoading(false);
  };

  const loadKeys = async () => {
    const allKeys = await base44.entities.AccessKey.list('-created_date');
    setKeys(allKeys);
  };

  const createNewKey = async () => {
    setCreating(true);
    const newKey = generateAccessKey();
    
    await base44.entities.AccessKey.create({
      key: newKey,
      is_grandmaster: false,
      status: 'active'
    });
    
    await loadKeys();
    setCreating(false);
  };

  const updateKeyStatus = async (keyId, newStatus) => {
    const keyToUpdate = keys.find(k => k.id === keyId);
    if (keyToUpdate?.is_grandmaster) {
      return;
    }
    
    await base44.entities.AccessKey.update(keyId, { status: newStatus });
    await loadKeys();
    setConfirmAction(null);
  };

  const deleteKey = async (keyId) => {
    const keyToDelete = keys.find(k => k.id === keyId);
    if (keyToDelete?.is_grandmaster) {
      return;
    }
    
    await base44.entities.AccessKey.delete(keyId);
    await loadKeys();
    setConfirmAction(null);
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    await base44.auth.updateMe({ theme: newTheme });
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const toggleKeyVisibility = (keyId) => {
    setRevealedKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const filteredKeys = keys.filter(k => 
    k.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.claimed_by_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.claimed_by_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status, isGrandmaster) => {
    if (isGrandmaster) {
      return <Badge className="bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-md">Grandmaster</Badge>;
    }
    
    const styles = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
      revoked: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      deleted: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    };
    
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  if (loading) {
    return <LoadingScreen message="Loading Admin Panel..." />;
  }

  return (
    <div className={`premium-page min-h-screen ${theme === 'dark' ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Breadcrumbs items={[{ label: 'Admin Panel', href: createPageUrl('AdminPanel') }]} />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Shield className="w-8 h-8 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage access keys for Berean Examination</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="premium-btn-icon text-gray-900 dark:text-gray-200 dark:border-gray-700"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="premium-btn-icon text-gray-900 dark:text-gray-200 dark:border-gray-700"
                >
                  <Bug className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 dark:bg-gray-900 dark:border-gray-800">
                <DropdownMenuItem 
                  onClick={() => window.location.href = '/nonexistent-test-page'}
                  className="dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Test 404 Page
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => window.location.href = createPageUrl('ChapterArt')}
                  className="dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Chapter Art Manager
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={activeView === 'inbox' ? 'default' : 'outline'}
              onClick={() => setActiveView(activeView === 'inbox' ? 'keys' : 'inbox')}
              className={activeView === 'inbox' 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : 'premium-btn-secondary text-gray-900 dark:text-gray-200 dark:border-gray-700'
              }
            >
              <Inbox className="w-4 h-4 mr-2" />
              Inbox
            </Button>

            <Button
              variant={activeView === 'updates' ? 'default' : 'outline'}
              onClick={() => {
                const newView = activeView === 'updates' ? 'keys' : 'updates';
                setActiveView(newView);
                trackActivity({
                  type: newView === 'updates' ? 'admin_updates' : 'admin_keys',
                  page: 'AdminPanel',
                  title: newView === 'updates' ? 'Continue that update push?' : 'Continue managing access keys?',
                  icon: newView === 'updates' ? 'updates' : 'admin',
                  admin_only: true,
                  url_params: `view=${newView}`,
                });
              }}
              className={activeView === 'updates' 
                ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                : 'premium-btn-secondary text-gray-900 dark:text-gray-200 dark:border-gray-700'
              }
            >
              <Megaphone className="w-4 h-4 mr-2" />
              Update Pusher
            </Button>

            <Button
              variant={activeView === 'places' ? 'default' : 'outline'}
              onClick={() => setActiveView(activeView === 'places' ? 'keys' : 'places')}
              className={activeView === 'places'
                ? 'bg-orange-700 hover:bg-orange-800 text-white'
                : 'premium-btn-secondary text-gray-900 dark:text-gray-200 dark:border-gray-700'
              }
            >
              <MapPin className="w-4 h-4 mr-2" />
              Places Importer
            </Button>

            <Button
              variant={activeView === 'geo_sources' ? 'default' : 'outline'}
              onClick={() => setActiveView(activeView === 'geo_sources' ? 'keys' : 'geo_sources')}
              className={activeView === 'geo_sources'
                ? 'bg-orange-700 hover:bg-orange-800 text-white'
                : 'premium-btn-secondary text-gray-900 dark:text-gray-200 dark:border-gray-700'
              }
            >
              <Database className="w-4 h-4 mr-2" />
              Geography Data Sources
            </Button>
          </div>
        </div>

        {activeView === 'inbox' ? (
          <AdminInbox />
        ) : activeView === 'updates' ? (
          <UpdatePusherForm onBack={() => setActiveView('keys')} />
        ) : activeView === 'places' ? (
          <BiblicalLocationsManager />
        ) : activeView === 'geo_sources' ? (
          <BiblicalGeographyDataSourcesManager />
        ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Keys', value: keys.length, icon: '🔑' },
            { label: 'Active', value: keys.filter(k => k.status === 'active').length, icon: '✓' },
            { label: 'Claimed', value: keys.filter(k => k.claimed_by_email).length, icon: '👤' },
            { label: 'Paused/Revoked', value: keys.filter(k => k.status === 'paused' || k.status === 'revoked').length, icon: '⏸' }
          ].map(stat => (
            <div key={stat.label} className="premium-stat-card p-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 relative overflow-hidden">
              <div className="stat-icon-watermark">{stat.icon}</div>
              <p className="text-xs text-gray-500 dark:text-gray-500 font-medium mb-1">{stat.label}</p>
              <p className="stat-number text-3xl font-bold text-gray-900 dark:text-white" data-value={stat.value}>0</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <Input
              placeholder="Search by key, username, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="premium-search-input pl-10 pr-9 dark:bg-gray-900 dark:border-gray-700"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="premium-btn-icon absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button onClick={loadKeys} variant="outline" className="premium-btn-secondary text-gray-900 dark:text-gray-200 dark:border-gray-700">
            <RefreshCw className="refresh-icon w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={createNewKey} disabled={creating} className="premium-btn-primary bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md">
            {creating ? <LoadingSpinner size="sm" className="mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Generate New Key
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-gray-800">
                <TableHead className="dark:text-gray-400">Key</TableHead>
                <TableHead className="dark:text-gray-400">Status</TableHead>
                <TableHead className="dark:text-gray-400">Claimed By</TableHead>
                <TableHead className="dark:text-gray-400">Created</TableHead>
                <TableHead className="dark:text-gray-400">Claimed At</TableHead>
                <TableHead className="dark:text-gray-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKeys.map(key => (
                <TableRow key={key.id} className="premium-table-row dark:border-gray-800">
                  <TableCell className="font-mono text-sm dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <span className={revealedKeys.has(key.id) ? '' : 'blur-sm select-none'}>
                        {key.key}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="premium-btn-icon h-6 w-6"
                        onClick={() => toggleKeyVisibility(key.id)}
                      >
                        {revealedKeys.has(key.id) ? (
                          <EyeOff className="w-3 h-3 text-gray-400" />
                        ) : (
                          <Eye className="w-3 h-3 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="premium-btn-icon h-6 w-6"
                        onClick={() => copyKey(key.key)}
                      >
                        {copiedKey === key.key ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(key.status, key.is_grandmaster)}</TableCell>
                  <TableCell className="dark:text-gray-300">
                    {key.claimed_by_username ? (
                      <div>
                        <p className="font-medium">{key.claimed_by_username}</p>
                        <p className="text-xs text-gray-500">{key.claimed_by_email}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Unclaimed</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(key.created_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                    {key.claimed_at ? format(new Date(key.claimed_at), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {!key.is_grandmaster && (
                      <div className="flex justify-end gap-1">
                        {key.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="premium-btn-icon h-8 w-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                            onClick={() => setConfirmAction({ type: 'pause', key })}
                          >
                            <Pause className="w-4 h-4" />
                          </Button>
                        )}
                        {key.status === 'paused' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="premium-btn-icon h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                            onClick={() => updateKeyStatus(key.id, 'active')}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {key.status !== 'revoked' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="premium-btn-icon h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={() => setConfirmAction({ type: 'revoke', key })}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="premium-btn-icon h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => setConfirmAction({ type: 'delete', key })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No keys match your search' : 'No keys created yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </>
        )}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="dark:bg-gray-900 dark:border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">
              {confirmAction?.type === 'delete' && 'Delete Key'}
              {confirmAction?.type === 'pause' && 'Pause Key'}
              {confirmAction?.type === 'revoke' && 'Revoke Key'}
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              {confirmAction?.type === 'delete' && 'This will permanently delete this access key. This action cannot be undone.'}
              {confirmAction?.type === 'pause' && 'Pausing this key will temporarily prevent access. The user can resume once you unpause.'}
              {confirmAction?.type === 'revoke' && 'Revoking this key will permanently block access for this user.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="premium-btn-secondary dark:border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction.type === 'delete') {
                  deleteKey(confirmAction.key.id);
                } else if (confirmAction.type === 'pause') {
                  updateKeyStatus(confirmAction.key.id, 'paused');
                } else if (confirmAction.type === 'revoke') {
                  updateKeyStatus(confirmAction.key.id, 'revoked');
                }
              }}
              className={`premium-btn-primary ${
                confirmAction?.type === 'delete' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : confirmAction?.type === 'revoke'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        /* Premium Page Polish */
        .premium-page {
          position: relative;
        }

        .premium-page::before {
          content: '';
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.15) 100%);
          pointer-events: none;
          z-index: 0;
        }

        .premium-page::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          opacity: 0.4;
          pointer-events: none;
          mix-blend-mode: overlay;
          z-index: 0;
        }

        .premium-page > * {
          position: relative;
          z-index: 1;
        }

        /* Global Premium Button System */
        .premium-btn-primary,
        .premium-btn-secondary,
        .premium-btn-icon {
          position: relative;
          overflow: hidden;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, box-shadow;
        }

        .premium-btn-primary::before,
        .premium-btn-secondary::before,
        .premium-btn-icon::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            110deg,
            transparent 0%,
            rgba(255, 255, 255, 0.12) 25%,
            rgba(255, 248, 220, 0.18) 50%,
            rgba(255, 255, 255, 0.12) 75%,
            transparent 100%
          );
          pointer-events: none;
          transition: left 0s;
        }

        .premium-btn-primary:hover,
        .premium-btn-secondary:hover,
        .premium-btn-icon:hover {
          transform: translateY(-1px) scale(1.01);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .premium-btn-primary:hover::before,
        .premium-btn-secondary:hover::before,
        .premium-btn-icon:hover::before {
          left: 100%;
          transition: left 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .premium-btn-primary:active,
        .premium-btn-secondary:active,
        .premium-btn-icon:active {
          transform: translateY(0px) scale(0.99);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          transition: all 0.12s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .premium-btn-primary:focus-visible,
        .premium-btn-secondary:focus-visible,
        .premium-btn-icon:focus-visible {
          outline: 2px solid rgba(251, 191, 36, 0.6);
          outline-offset: 2px;
          box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.15);
        }

        .premium-btn-primary:disabled,
        .premium-btn-secondary:disabled,
        .premium-btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .premium-btn-primary:disabled::before,
        .premium-btn-secondary:disabled::before,
        .premium-btn-icon:disabled::before {
          display: none;
        }

        /* Primary Button Extra Polish */
        .premium-btn-primary {
          box-shadow: 0 2px 8px rgba(234, 88, 12, 0.3);
        }

        .premium-btn-primary:hover {
          box-shadow: 
            0 4px 16px rgba(234, 88, 12, 0.4),
            0 0 24px rgba(251, 191, 36, 0.2);
        }

        .premium-btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at var(--spark-x, 50%) var(--spark-y, 50%), rgba(255, 255, 255, 0.4) 0%, transparent 50%);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }

        .premium-btn-primary:active::after {
          opacity: 1;
          transition: opacity 0s;
        }

        /* Refresh Icon Rotation */
        .premium-btn-secondary:active .refresh-icon {
          animation: refreshSpin 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes refreshSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Stat Cards */
        .premium-stat-card {
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .premium-stat-card:hover {
          transform: translateY(-1px);
          box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .premium-stat-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            110deg,
            transparent 0%,
            rgba(251, 191, 36, 0.04) 50%,
            transparent 100%
          );
          opacity: 0;
          transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .premium-stat-card:hover::before {
          opacity: 1;
        }

        .stat-icon-watermark {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 32px;
          opacity: 0.04;
          user-select: none;
          pointer-events: none;
        }

        .dark .stat-icon-watermark {
          opacity: 0.06;
        }

        .stat-number {
          transition: color 0.3s;
        }

        /* Search Input */
        .premium-search-input {
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .premium-search-input::placeholder {
          opacity: 0.5;
        }

        .premium-search-input:focus {
          border-color: rgba(251, 191, 36, 0.6);
          box-shadow: 
            0 0 0 3px rgba(251, 191, 36, 0.12),
            0 2px 8px rgba(245, 158, 11, 0.15);
        }

        .premium-search-input:focus::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.1));
          z-index: -1;
          animation: searchGlow 0.4s ease-out;
        }

        @keyframes searchGlow {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Table Rows */
        .premium-table-row {
          position: relative;
          transition: background-color 0.18s ease;
        }

        .premium-table-row::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(180deg, rgba(251, 191, 36, 0.8), rgba(245, 158, 11, 0.6));
          opacity: 0;
          transition: opacity 0.18s ease;
        }

        .premium-table-row:hover {
          background-color: rgba(251, 191, 36, 0.03);
        }

        .dark .premium-table-row:hover {
          background-color: rgba(251, 191, 36, 0.05);
        }

        .premium-table-row:hover::before {
          opacity: 1;
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .premium-btn-primary,
          .premium-btn-secondary,
          .premium-btn-icon,
          .premium-stat-card,
          .premium-search-input,
          .premium-table-row {
            transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
          }

          .premium-btn-primary:hover,
          .premium-btn-secondary:hover,
          .premium-btn-icon:hover,
          .premium-stat-card:hover {
            transform: none;
          }

          .premium-btn-primary:active,
          .premium-btn-secondary:active,
          .premium-btn-icon:active {
            transform: none;
            filter: brightness(0.95);
          }

          .premium-btn-primary::before,
          .premium-btn-secondary::before,
          .premium-btn-icon::before,
          .premium-stat-card::before,
          .premium-btn-primary::after {
            display: none;
          }

          @keyframes refreshSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(0deg); }
          }

          @keyframes searchGlow {
            from { opacity: 1; transform: scale(1); }
            to { opacity: 1; transform: scale(1); }
          }

          .stat-number {
            animation: none !important;
          }
        }

        /* Ensure interactive elements are keyboard accessible */
        button:focus-visible,
        a:focus-visible,
        input:focus-visible {
          outline: 2px solid rgba(251, 191, 36, 0.6);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}