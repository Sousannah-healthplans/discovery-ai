import { useState, useMemo } from 'react';
import { 
  MousePointerClick, 
  Scroll, 
  Keyboard, 
  Home, 
  Heart, 
  Eye, 
  EyeOff, 
  Navigation, 
  FormInput, 
  Filter,
  Search,
  Clock,
  Activity,
  Zap,
  Globe
} from 'lucide-react';
import { formatDate } from '../lib/utils';

const ICONS = {
  tab_created: Globe,
  tab_updated: Globe,
  tab_activated: Eye,
  tab_deactivated: EyeOff,
  tab_removed: EyeOff,
  click: MousePointerClick,
  button_click: MousePointerClick,
  dblclick: MousePointerClick,
  input: Keyboard,
  input_polled: Keyboard,
  field_focus: Eye,
  field_blur: EyeOff,
  clipboard_paste: Keyboard,
  clipboard_copy: Keyboard,
  context_menu: MousePointerClick,
  form_snapshot: FormInput,
  scroll: Scroll,
  page_view: Home,
  navigation: Navigation,
  heartbeat: Heart,
  window_blur: EyeOff,
  window_focus: Eye,
  form_submit: FormInput,
  blur: EyeOff,
  change: Keyboard,
  inactive_start: Clock,
  inactive_end: Activity,
  performance_navigation: Zap,
  session_start: Activity,
  session_end: Activity,
  event: MousePointerClick,
};

const EVENT_DESCRIPTIONS = {
  tab_created: 'New tab opened',
  tab_updated: 'Tab information updated',
  tab_activated: 'Tab became active',
  tab_deactivated: 'Tab became inactive',
  tab_removed: 'Tab closed',
  heartbeat: 'User activity detected - session is active',
  window_blur: 'User switched to another window/tab',
  window_focus: 'User returned to this window/tab',
  click: 'User clicked on an element',
  button_click: 'User clicked a button',
  dblclick: 'User double-clicked on an element',
  input: 'User typed in a form field',
  input_polled: 'Input value changed (detected by polling)',
  field_focus: 'User focused on a form field',
  field_blur: 'User left a form field',
  clipboard_paste: 'User pasted content',
  clipboard_copy: 'User copied content',
  context_menu: 'User opened context menu',
  form_snapshot: 'Form fields snapshot captured',
  change: 'Form field value was modified',
  blur: 'User left a form field',
  form_submit: 'User submitted a form',
  page_view: 'User viewed a page',
  navigation: 'User navigated to a new page',
  inactive_start: 'User became inactive',
  inactive_end: 'User became active again',
  performance_navigation: 'Page navigation performance measured',
  session_start: 'New session started',
  session_end: 'Session ended',
  event: 'Custom event triggered',
  scroll: 'User scrolled the page'
};

const EVENT_CATEGORIES = {
  tabs: ['tab_created', 'tab_updated', 'tab_activated', 'tab_deactivated', 'tab_removed'],
  interaction: ['click', 'button_click', 'dblclick', 'input', 'input_polled', 'change', 'blur', 'field_focus', 'field_blur', 'form_submit', 'clipboard_paste', 'clipboard_copy', 'context_menu', 'form_snapshot'],
  navigation: ['page_view', 'navigation', 'performance_navigation'],
  activity: ['heartbeat', 'window_blur', 'window_focus', 'inactive_start', 'inactive_end'],
  system: ['session_start', 'session_end', 'event']
};

function getEventCategory(type) {
  for (const [category, types] of Object.entries(EVENT_CATEGORIES)) {
    if (types.includes(type)) return category;
  }
  return 'other';
}

function getElementDescription(selector, data) {
  // Handle extension element data in event.data.element
  const el = data?.element;
  if (el) {
    const parts = [];
    if (el.tag) parts.push(`<${el.tag}>`);
    if (el.ariaLabel) parts.push(`"${el.ariaLabel}"`);
    else if (el.placeholder) parts.push(`"${el.placeholder}"`);
    else if (el.name) parts.push(`name="${el.name}"`);
    else if (el.id) parts.push(`#${el.id}`);
    else if (el.text && el.text.length < 40) parts.push(`"${el.text}"`);
    if (el.role) parts.push(`role=${el.role}`);
    return parts.join(' ') || (el.tag ? `${el.tag} element` : '');
  }

  if (!selector) return '';
  
  const elementType = selector.match(/^[a-zA-Z]+/)?.[0] || '';
  const hasId = selector.includes('#');
  const hasClass = selector.includes('.');
  
  if (hasId) {
    const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch) return `Element with ID: ${idMatch[1]}`;
  }
  
  if (hasClass) {
    const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
    if (classMatch) return `Element with class: ${classMatch[1]}`;
  }
  
  if (elementType) return `${elementType} element`;
  if (selector && !selector.includes('://') && selector.length < 80) return selector;
  
  return 'Page element';
}

function getNavigationDescription(data) {
  if (!data) return '';
  
  if (data.from && data.to) {
    return `From: ${data.from} → To: ${data.to}`;
  }
  
  if (data.path) {
    return `Navigated to: ${data.path}`;
  }
  
  if (data.url) {
    return `Navigated to: ${data.url}`;
  }
  
  return 'Page navigation';
}

export default function SessionTimeline({ actions }) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRawData, setShowRawData] = useState(false);

  const filteredActions = useMemo(() => {
    let filtered = actions;

    // Apply category filter
    if (filter !== 'all') {
      const categoryTypes = EVENT_CATEGORIES[filter] || [];
      filtered = filtered.filter(action => categoryTypes.includes(action.type));
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(action => {
        const description = EVENT_DESCRIPTIONS[action.type] || '';
        const elementDesc = getElementDescription(action.label, action.data);
        const searchLower = searchTerm.toLowerCase();
        
        return (
          action.type.toLowerCase().includes(searchLower) ||
          description.toLowerCase().includes(searchLower) ||
          elementDesc.toLowerCase().includes(searchLower) ||
          (action.label || '').toLowerCase().includes(searchLower) ||
          (action.data?.value ? String(action.data.value).toLowerCase().includes(searchLower) : false)
        );
      });
    }

    return filtered;
  }, [actions, filter, searchTerm]);

  const eventStats = useMemo(() => {
    const stats = {};
    actions.forEach(action => {
      stats[action.type] = (stats[action.type] || 0) + 1;
    });
    return stats;
  }, [actions]);

  const sessionDuration = useMemo(() => {
    if (actions.length === 0) return 0;
    const firstEvent = new Date(actions[actions.length - 1].ts);
    const lastEvent = new Date(actions[0].ts);
    return Math.round((lastEvent - firstEvent) / 1000);
  }, [actions]);

  return (
    <div className="space-y-4">
      {/* Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-xs text-slate-400">Total Events</div>
          <div className="text-lg font-semibold text-cyan-400">{actions.length}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-xs text-slate-400">Session Duration</div>
          <div className="text-lg font-semibold text-cyan-400">
            {Math.floor(sessionDuration / 60)}m {sessionDuration % 60}s
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-xs text-slate-400">Page Views</div>
          <div className="text-lg font-semibold text-cyan-400">
            {eventStats.page_view || 0}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-xs text-slate-400">Interactions</div>
          <div className="text-lg font-semibold text-cyan-400">
            {(eventStats.click || 0) + (eventStats.button_click || 0) + (eventStats.input || 0)}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
        <div className="space-y-3">
          {/* First row - Filter dropdown and Raw Data toggle */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-3 flex-1">
              <Filter size={18} className="text-slate-400 flex-shrink-0" />
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all w-full sm:w-auto sm:min-w-[140px]"
              >
                <option value="all">All Events</option>
                <option value="tabs">Tabs</option>
                <option value="interaction">Interactions</option>
                <option value="navigation">Navigation</option>
                <option value="activity">Activity</option>
                <option value="system">System</option>
              </select>
            </div>
            
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors whitespace-nowrap"
            >
              {showRawData ? 'Hide' : 'Show'} Raw Data
            </button>
          </div>
          
          {/* Second row - Search input */}
          <div className="flex items-center gap-3">
            <Search size={18} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search events, elements, or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all flex-1"
            />
          </div>
        </div>
        
        {/* Active Filters Display */}
        {(filter !== 'all' || searchTerm) && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
              <span>Active filters:</span>
              {filter !== 'all' && (
                <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-md text-xs">
                  {filter}
                </span>
              )}
              {searchTerm && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs">
                  "{searchTerm}"
                </span>
              )}
              <button
                onClick={() => {
                  setFilter('all')
                  setSearchTerm('')
                }}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Event Timeline */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="max-h-[500px] overflow-y-auto pr-2">
          <ol className="relative border-l-2 border-slate-300 dark:border-slate-600 pl-6 space-y-4">
            {filteredActions.map((a, index) => {
              const Icon = ICONS[a.type] || MousePointerClick;
              const description = EVENT_DESCRIPTIONS[a.type] || `${a.type} event`;
              const elementDesc = getElementDescription(a.label, a.data);
              const category = getEventCategory(a.type);
              
              return (
                <li key={a.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-8 top-1 bg-white dark:bg-slate-800 border-2 border-cyan-500 rounded-full w-6 h-6 grid place-items-center shadow-lg">
                    <Icon size={14} className="text-cyan-500" />
                  </div>
                  
                  {/* Event card */}
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          {formatDate(a.ts)}
                        </span>
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium">
                          {category}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-500 font-mono">
                        #{index + 1}
                      </span>
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-2">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                        {description}
                      </div>
                      
                      {elementDesc && (
                        <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-2 rounded border-l-2 border-cyan-400">
                          <span className="font-medium">Element:</span> {elementDesc}
                        </div>
                      )}
                      
                      {(a.type === 'input' || a.type === 'input_polled' || a.type === 'change' || a.type === 'clipboard_paste') && a.data?.value && (
                        <div className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded border-l-2 border-emerald-400">
                          <span className="font-medium">Value:</span>{' '}
                          <span className="font-mono">{a.data.sensitive ? '***' : String(a.data.value).substring(0, 200)}</span>
                          {a.data.element && (
                            <div className="text-xs mt-1 opacity-75">
                              Field: {a.data.element.ariaLabel || a.data.element.name || a.data.element.placeholder || a.data.element.id || a.data.element.tag || 'unknown'}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {a.type === 'navigation' && (
                        <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border-l-2 border-blue-400">
                          <span className="font-medium">Navigation:</span> {getNavigationDescription(a.data)}
                        </div>
                      )}
                      
                      {(a.type === 'tab_created' || a.type === 'tab_updated' || a.type === 'tab_activated' || a.type === 'tab_deactivated' || a.type === 'tab_removed') && (
                        <div className="text-sm text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 p-2 rounded border-l-2 border-cyan-400">
                          <span className="font-medium">Tab:</span>{' '}
                          {a.data?.title || a.data?.url || a.label || 'Unknown tab'}
                          {a.data?.url && (
                            <div className="text-xs mt-1 opacity-75">{a.data.url}</div>
                          )}
                          {a.type === 'tab_deactivated' && a.data?.totalActiveMs && (
                            <div className="text-xs mt-1 opacity-75">
                              Time spent: {Math.round(a.data.totalActiveMs / 1000)}s
                            </div>
                          )}
                        </div>
                      )}
                      
                      {showRawData && a.label && (
                        <div className="text-xs text-slate-500 dark:text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 p-3 rounded border">
                          <div className="font-medium text-slate-600 dark:text-slate-400 mb-1">Raw Selector:</div>
                          <div className="break-all">{a.label}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        
        {filteredActions.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Activity size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No events found</p>
            <p className="text-sm">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </div>
  );
}


