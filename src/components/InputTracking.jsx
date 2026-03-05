import { useMemo } from 'react';
import { Keyboard, EyeOff, Shield, AlertTriangle, Calendar } from 'lucide-react';
import { formatDate } from '../lib/utils';

const SENSITIVE_FIELD_PATTERNS = [
  'password', 'passwd', 'pwd', 'secret', 'token', 'key', 'auth',
  'credit', 'card', 'cvv', 'cvc', 'ssn', 'social', 'security',
  'pin', 'code', 'otp', 'verification', 'confirm', 'confirm-password'
];

const SENSITIVE_FIELD_ATTRIBUTES = [
  'type="password"', 'autocomplete="password"', 'autocomplete="new-password"',
  'autocomplete="current-password"', 'autocomplete="credit-card"',
  'autocomplete="cc-number"', 'autocomplete="cc-csc"', 'autocomplete="cc-exp"'
];

function isSensitiveField(selector, data) {
  // Check the element type directly (from extension data)
  if (data && data.type === 'password') return true;
  
  if (!selector) return false;
  const selectorLower = selector.toLowerCase();
  
  const hasSensitivePattern = SENSITIVE_FIELD_PATTERNS.some(pattern => 
    selectorLower.includes(pattern)
  );
  
  // Check name/id from element data
  const elName = (data?.name || data?.id || '').toLowerCase();
  const hasNamePattern = elName && SENSITIVE_FIELD_PATTERNS.some(p => elName.includes(p));
  
  const hasSensitiveAttribute = data && typeof data === 'string' && SENSITIVE_FIELD_ATTRIBUTES.some(attr => 
    data.includes(attr)
  );
  
  return hasSensitivePattern || hasNamePattern || hasSensitiveAttribute;
}

function getFieldType(selector, data) {
  // Use the actual input type from element data when available
  if (data && data.type) {
    const t = data.type.toLowerCase();
    if (['password', 'email', 'tel', 'number', 'date', 'url', 'search', 'color', 'range', 'file'].includes(t)) {
      return t === 'tel' ? 'phone' : t;
    }
  }
  if (data && data.contentEditable) return 'contenteditable';
  if (data && data.tag === 'textarea') return 'textarea';
  if (data && data.tag === 'select') return 'select';
  
  if (!selector) return 'text';
  const selectorLower = selector.toLowerCase();
  
  if (selectorLower.includes('password') || selectorLower.includes('passwd')) return 'password';
  if (selectorLower.includes('email') || selectorLower.includes('mail')) return 'email';
  if (selectorLower.includes('phone') || selectorLower.includes('tel')) return 'phone';
  if (selectorLower.includes('date') || selectorLower.includes('birth')) return 'date';
  if (selectorLower.includes('number') || selectorLower.includes('amount') || selectorLower.includes('price')) return 'number';
  
  return 'text';
}

function getFieldName(selector, data) {
  if (!selector) return 'Unknown field';
  
  // Extension element data uses flat properties: { tag, id, name, ariaLabel, placeholder, ... }
  if (data && data.ariaLabel) {
    return data.ariaLabel;
  }
  
  if (data && data.name) {
    return data.name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  if (data && data.placeholder) {
    return data.placeholder;
  }
  
  if (data && data.label) {
    return data.label;
  }

  if (data && data.text && data.text.length > 0 && data.text.length < 50) {
    return data.text;
  }
  
  // CSS selector parsing fallback
  const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    return idMatch[1].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
  if (classMatch) {
    return classMatch[1].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  const nameMatch = selector.match(/\[name="([^"]+)"\]/);
  if (nameMatch) {
    return nameMatch[1].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  if (data && data.tag) {
    return `${data.tag} field`;
  }

  // If selector is a plain identifier (not a URL), use it directly
  if (selector && !selector.includes('://') && selector.length < 50) {
    return selector.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  return 'Form field';
}

function getFieldLocation(selector, data) {
  if (!selector) return 'Unknown location';
  
  if (data && data.page) return data.page;
  
  if (data && data.url) {
    try {
      const url = new URL(data.url);
      return url.pathname;
    } catch {
      return data.url;
    }
  }
  
  // Use element tag and role for context
  if (data && data.tag && data.role) {
    return `${data.tag}[role=${data.role}]`;
  }
  if (data && data.tag) {
    return `${data.tag} element`;
  }
  
  const formMatch = selector.match(/form\[[^\]]*\]/);
  if (formMatch) return `Form: ${formMatch[0]}`;
  
  return 'Page element';
}

function getInputType(value, selector, data) {
  if (!value) return 'empty';
  
  // Check if it's a number
  if (!isNaN(value) && !isNaN(parseFloat(value))) {
    return 'number';
  }
  
  // Check if it's an email
  if (typeof value === 'string' && value.includes('@') && value.includes('.')) {
    return 'email';
  }
  
  // Check if it's a URL
  if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('www'))) {
    return 'url';
  }
  
  // Check if it's a phone number
  if (typeof value === 'string' && /^[+]?[0-9\s()-]+$/.test(value) && value.length >= 7) {
    return 'phone';
  }
  
  // Check if it's a date
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'date';
  }
  
  // Check if it's a boolean/option
  if (typeof value === 'boolean' || ['true', 'false', 'yes', 'no', 'on', 'off'].includes(value.toLowerCase())) {
    return 'option';
  }
  
  // Check if it's a selection from dropdown
  if (data && data.options && data.options.includes(value)) {
    return 'selection';
  }
  
  return 'text';
}

function formatInputValue(value, inputType) {
  if (!value) return '[Empty input]';
  
  switch (inputType) {
    case 'number':
      return `Number: ${value}`;
    case 'email':
      return `Email: ${value}`;
    case 'url':
      return `URL: ${value}`;
    case 'phone':
      return `Phone: ${value}`;
    case 'date':
      return `Date: ${value}`;
    case 'option':
      return `Option: ${value}`;
    case 'selection':
      return `Selected: ${value}`;
    default:
      return value;
  }
}

export default function InputTracking({ actions }) {
  const inputEvents = useMemo(() => {
    const inputMap = new Map();
    
    actions.forEach(action => {
      const isKeyLike = action.type === 'key_down' || action.type === 'key_up' || action.type === 'key_press' || action.type === 'keypress';
      const isPageKeyLike = action.type === 'page_event' && ['key_down','key_up','key_press','keypress'].includes(action.data?.type);
      const isInputEvent = action.type === 'input' || 
                          action.type === 'change' || 
                          action.type === 'blur' ||
                          action.type === 'field_blur' ||
                          action.type === 'field_focus' ||
                          action.type === 'input_polled' ||
                          action.type === 'clipboard_paste' ||
                          action.type === 'form_snapshot' ||
                          isKeyLike ||
                          (action.type === 'page_event' && ['input','change','blur','field_blur','field_focus','input_polled','clipboard_paste'].includes(action.data?.type)) ||
                          isPageKeyLike;
      
      if (isInputEvent) {
        // Build a field identifier from the element's properties (not the page URL)
        const el = action.data?.element;
        const fieldKey = (el && (el.id || el.name || el.ariaLabel || el.placeholder)) ||
                        action.data?.selector ||
                        (el && el.tag ? `${el.tag}${el.classes?.length ? '.' + el.classes[0] : ''}` : null) ||
                        `${action.type}_${action.ts}`;
        
        // Handle form_snapshot: expand to individual fields
        if (action.type === 'form_snapshot' && action.data?.fields) {
          action.data.fields.forEach(f => {
            const fEl = f.element;
            const fKey = (fEl && (fEl.id || fEl.name || fEl.ariaLabel || fEl.placeholder)) ||
                        (fEl && fEl.tag ? `${fEl.tag}_snapshot` : 'snapshot_field');
            if (!inputMap.has(fKey)) {
              inputMap.set(fKey, {
                fieldName: getFieldName(fKey, fEl || f),
                fieldType: getFieldType(fKey, fEl || f),
                fieldLocation: getFieldLocation(fKey, fEl || f),
                selector: fKey,
                isSensitive: !!f.sensitive || isSensitiveField(fKey, fEl || f),
                inputs: [],
                blurEvents: []
              });
            }
            const fField = inputMap.get(fKey);
            if (f.value !== undefined && f.value !== '' && f.value !== null) {
              const val = String(f.value);
              const inputType = getInputType(val, fKey, f);
              fField.inputs.push({
                timestamp: action.ts,
                value: val,
                length: val.length,
                inputType: inputType,
                formattedValue: formatInputValue(val, inputType)
              });
            }
          });
          return;
        }

        if (!inputMap.has(fieldKey)) {
          const elementData = el || action.data;
          inputMap.set(fieldKey, {
            fieldName: getFieldName(fieldKey, elementData),
            fieldType: getFieldType(fieldKey, elementData),
            fieldLocation: getFieldLocation(fieldKey, elementData),
            selector: fieldKey,
            isSensitive: !!action.data?.sensitive || isSensitiveField(fieldKey, elementData),
            inputs: [],
            blurEvents: []
          });
        }
        
        const field = inputMap.get(fieldKey);
        
        // Handle input/change/input_polled events
        const isValueEvent = action.type === 'input' || action.type === 'change' || 
             action.type === 'input_polled' || action.type === 'clipboard_paste' ||
             (action.type === 'page_event' && ['input','change','input_polled','clipboard_paste'].includes(action.data?.type));

        if (isValueEvent && action.data && 
            (action.data.value !== undefined || action.data.text !== undefined || 
             action.data.inputValue !== undefined || action.data.pastedPreview !== undefined)) {
          const value = action.data.value ?? action.data.text ?? action.data.inputValue ?? action.data.pastedPreview ?? '';
          const inputType = getInputType(value, fieldKey, action.data);
          const source = action.type === 'input_polled' ? ' (polled)' : 
                        action.type === 'clipboard_paste' ? ' (pasted)' : '';
          field.inputs.push({
            timestamp: action.ts,
            value: value,
            length: value ? String(value).length : 0,
            inputType: inputType,
            formattedValue: formatInputValue(value, inputType) + source
          });
        }

        // Handle key events
        if (isKeyLike || isPageKeyLike) {
          const keyCandidate = action.data?.key
            || action.data?.code
            || action.data?.keyCode
            || action.data?.which
            || action.data?.event?.key
            || action.key;
          const keyStr = keyCandidate !== undefined && keyCandidate !== null ? String(keyCandidate) : '';
          field.inputs.push({
            timestamp: action.ts,
            value: keyStr || '[key]',
            length: keyStr ? 1 : 0,
            inputType: 'key',
            formattedValue: keyStr
              ? `Key: ${keyStr} (${action.type === 'key_up' ? 'up' : 'down'})`
              : `Key event (${action.type === 'key_up' ? 'up' : 'down'})`
          });
        }
        
        // Handle blur/field_blur events
        if (action.type === 'blur' || action.type === 'field_blur' ||
            (action.type === 'page_event' && (action.data?.type === 'blur' || action.data?.type === 'field_blur'))) {
          field.blurEvents.push({
            timestamp: action.ts,
            isSensitive: !!action.data?.sensitive || isSensitiveField(fieldKey, action.data)
          });
          // Also capture the final value from field_blur
          if (action.data?.value !== undefined && action.data?.value !== '') {
            const val = String(action.data.value);
            const inputType = getInputType(val, fieldKey, action.data);
            field.inputs.push({
              timestamp: action.ts,
              value: val,
              length: val.length,
              inputType: inputType,
              formattedValue: formatInputValue(val, inputType) + ' (final)'
            });
          }
        }
      }
    });
    
    return Array.from(inputMap.values())
      .filter(field => field.inputs.length > 0)
      .sort((a, b) => new Date(a.inputs[0].timestamp) - new Date(b.inputs[0].timestamp));
  }, [actions]);

  if (inputEvents.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <Keyboard size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No input data captured</p>
        <p className="text-sm">User inputs will appear here when detected during the session</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-xs text-slate-400">Total Fields</div>
          <div className="text-lg font-semibold text-cyan-400">{inputEvents.length}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-xs text-slate-400">Sensitive Fields</div>
          <div className="text-lg font-semibold text-red-400">
            {inputEvents.filter(field => field.isSensitive).length}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-xs text-slate-400">Total Inputs</div>
          <div className="text-lg font-semibold text-cyan-400">
            {inputEvents.reduce((sum, field) => sum + field.inputs.length, 0)}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-xs text-slate-400">Blurred Fields</div>
          <div className="text-lg font-semibold text-orange-400">
            {inputEvents.filter(field => field.blurEvents.length > 0).length}
          </div>
        </div>
      </div>

      {/* Input Fields */}
      <div className="space-y-3">
        {inputEvents.map((field, index) => (
          <div 
            key={index}
            className={`bg-white dark:bg-slate-800 border rounded-lg p-4 shadow-sm ${
              field.isSensitive 
                ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' 
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            {/* Field Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  field.isSensitive 
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {field.isSensitive ? <Shield size={16} /> : <Keyboard size={16} />}
                </div>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {field.fieldName}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-500">
                    {field.fieldType} field • {field.fieldLocation}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {field.isSensitive && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-xs font-medium flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Sensitive
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  {field.inputs.length} input{field.inputs.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Input History */}
            <div className="space-y-2">
              {field.inputs.map((input, inputIndex) => {
                const hasBlurAfter = field.blurEvents.some(blur => 
                  new Date(blur.timestamp) > new Date(input.timestamp)
                );
                
                return (
                  <div 
                    key={inputIndex}
                    className={`p-3 rounded-lg border ${
                      hasBlurAfter && field.isSensitive
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                        : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Calendar size={14} />
                        <span>{formatDate(input.timestamp)}</span>
                        <span className="text-slate-400">•</span>
                        <span>{input.length} character{input.length !== 1 ? 's' : ''}</span>
                        <span className="text-slate-400">•</span>
                        <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {input.inputType}
                        </span>
                      </div>
                      
                      {hasBlurAfter && field.isSensitive && (
                        <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                          <EyeOff size={12} />
                          <span>Field was blurred</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="font-mono text-sm">
                      {field.isSensitive && hasBlurAfter ? (
                        <div className="text-orange-600 dark:text-orange-400">
                          [Sensitive data - field was blurred after input]
                        </div>
                      ) : field.isSensitive ? (
                        <div className="text-red-600 dark:text-red-400">
                          [Sensitive field detected - value hidden]
                        </div>
                      ) : (
                        <div className="text-slate-800 dark:text-slate-200 break-all">
                          {input.formattedValue || '[Empty input]'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Field Selector */}
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
              <div className="text-xs text-slate-500 dark:text-slate-500">
                <span className="font-medium">Selector:</span> 
                <span className="font-mono ml-1 break-all">{field.selector}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
