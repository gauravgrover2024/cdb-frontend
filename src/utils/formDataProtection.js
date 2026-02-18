/**
 * Form Data Protection Utility
 * Prevents data loss during page refresh and provides auto-save functionality
 * 
 * Features:
 * - Auto-save form data to localStorage periodically
 * - Warn user before leaving with unsaved changes
 * - Restore form data from localStorage on mount
 * - Clear saved data after successful save to server
 */

import React from 'react';
import { message } from 'antd';

// ============================================
// LOCAL STORAGE KEYS
// ============================================
const STORAGE_KEYS = {
  LOAN_FORM_DATA: 'loan_form_draft',
  CUSTOMER_FORM_DATA: 'customer_form_draft',
  DELIVERY_ORDER_FORM_DATA: 'delivery_order_form_draft',
};

// ============================================
// FORM DATA AUTO-SAVE HOOK
// ============================================
export const useFormAutoSave = (
  formName,
  form,
  isEditMode = false,
  onAutoSave = null
) => {
  const autoSaveTimerRef = React.useRef(null);
  const lastSavedRef = React.useRef(null);
  const [autoSaveStatus, setAutoSaveStatus] = React.useState(null); // 'saving', 'saved', 'error'

  const storageKey = STORAGE_KEYS[formName] || `${formName}_draft`;

  /**
   * Save current form data to localStorage
   */
  const saveToLocalStorage = React.useCallback((values) => {
    try {
      // Convert dayjs objects to ISO strings
      const stringified = convertDatesToStringsDeep(values);
      
      const data = {
        timestamp: new Date().toISOString(),
        formName,
        values: stringified,
      };

      localStorage.setItem(storageKey, JSON.stringify(data));
      setAutoSaveStatus('saved');
      
      // Clear status after 3 seconds
      setTimeout(() => setAutoSaveStatus(null), 3000);

      console.log(`✅ Auto-saved ${formName}:`, data);
      
      if (onAutoSave) onAutoSave(stringified);
      
      return true;
    } catch (err) {
      console.error(`❌ Failed to auto-save ${formName}:`, err);
      setAutoSaveStatus('error');
      return false;
    }
  }, [formName, storageKey, onAutoSave]);

  /**
   * Get saved form data from localStorage
   */
  const getSavedFormData = React.useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;

      const data = JSON.parse(saved);
      console.log(`📂 Retrieved saved ${formName} from localStorage:`, data);
      return data.values || null;
    } catch (err) {
      console.error(`❌ Failed to retrieve ${formName}:`, err);
      return null;
    }
  }, [formName, storageKey]);

  /**
   * Clear saved form data from localStorage
   */
  const clearSavedFormData = React.useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      console.log(`🗑️ Cleared saved ${formName} from localStorage`);
      return true;
    } catch (err) {
      console.error(`❌ Failed to clear ${formName}:`, err);
      return false;
    }
  }, [formName, storageKey]);

  /**
   * Restore saved form data with confirmation dialog
   * Asks user before restoring to prevent data from other forms
   */
  const restoreSavedFormData = React.useCallback(() => {
    if (!form) return false;

    try {
      const savedDataStr = localStorage.getItem(storageKey);
      if (!savedDataStr) return false;

      const savedData = JSON.parse(savedDataStr);
      if (!savedData || !savedData.values) return false;

      // Get timestamp of saved data
      const savedTime = savedData.timestamp ? new Date(savedData.timestamp) : new Date();
      const now = new Date();
      const minutesAgo = Math.floor((now - savedTime) / (1000 * 60));
      
      // Show confirmation dialog before restoring with close button
      const messageKey = `restore-${Date.now()}`;
      
      message.info({
        key: messageKey,
        content: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingRight: '8px' }}>
            <div style={{ flex: 1 }}>
              You have unsaved form data from {isNaN(minutesAgo) || minutesAgo < 0 ? '0' : minutesAgo} minute{minutesAgo !== 1 ? 's' : ''} ago. Do you want to restore it?
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                message.destroy(messageKey);
                clearSavedFormData();
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 4px',
                color: 'rgba(0, 0, 0, 0.45)',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close"
              title="Dismiss and clear saved data"
            >
              ×
            </button>
          </div>
        ),
        duration: 0, // Stay until user responds
        onClick: () => {
          message.destroy(messageKey);
          try {
            // Convert ISO strings back to dayjs
            const dayjified = convertAnyDateToDayjsDeep(savedData.values);
            form.setFieldsValue(dayjified);
            
            console.log(`✨ Restored ${formName} from saved data`);
            message.success('Form data restored ✅');
            clearSavedFormData(); // Clear after successful restore
          } catch (err) {
            console.error(`❌ Failed to restore ${formName}:`, err);
            message.error('Failed to restore form data ❌');
          }
        },
      });
      
      return true; // Async operation started
    } catch (err) {
      console.error(`❌ Error checking saved ${formName}:`, err);
      return false;
    }
  }, [form, formName, getSavedFormData, clearSavedFormData]);

  /**
   * Handle form value changes for auto-save
   * This should be called from Form component's onValuesChange prop
   * Debounced to save every 30 seconds
   */
  const handleFormValuesChange = React.useCallback(() => {
    if (!form) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Get current form values
    const values = form.getFieldsValue();
    const stringified = JSON.stringify(convertDatesToStringsDeep(values));

    // Check if values changed from last save
    if (stringified === lastSavedRef.current) {
      return; // No changes, skip save
    }

    // Set new timer for auto-save
    autoSaveTimerRef.current = setTimeout(() => {
      const result = saveToLocalStorage(values);
      if (result) {
        lastSavedRef.current = stringified;
      }
    }, 30000); // Save after 30 seconds of inactivity
  }, [form, saveToLocalStorage]);

  /**
   * Setup beforeunload warning for unsaved changes
   */
  const setupBeforeUnloadWarning = React.useCallback(() => {
    const handleBeforeUnload = (e) => {
      // Only warn if there are unsaved changes
      const currentValues = form?.getFieldsValue();
      const stringified = JSON.stringify(convertDatesToStringsDeep(currentValues || {}));
      
      if (stringified === lastSavedRef.current) {
        return; 
      }

      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [form]);

  /**
   * Initialize: restore data on mount
   */
  React.useEffect(() => {
    if (!form || isEditMode) return; // Don't restore in edit mode (use server data)

    // Try to restore saved form data
    restoreSavedFormData();

    // Setup beforeunload warning
    const cleanup = setupBeforeUnloadWarning();

    return () => {
      cleanup();
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [form, isEditMode, restoreSavedFormData, setupBeforeUnloadWarning]);

  return {
    autoSaveStatus,
    saveToLocalStorage,
    getSavedFormData,
    clearSavedFormData,
    restoreSavedFormData,
    handleFormValuesChange, // Return this so Form can use it via onValuesChange
  };
};

// ============================================
// PREVENT PAGE REFRESH DURING FORM EDITING
// ============================================
export const usePreventPageRefresh = (isFormDirty = false) => {
  React.useEffect(() => {
    if (!isFormDirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return '';
    };

    const handleKeyDown = (e) => {
      // Prevent F5 and Ctrl+R
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r')) {
        e.preventDefault();
        message.warning('Form is being edited. Please save before refreshing.');
        return false;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFormDirty]);
};

// ============================================
// AUTO-SAVE STATUS INDICATOR
// ============================================
export const AutoSaveIndicator = ({ status }) => {
  if (!status) return null;

  const statusConfig = {
    saving: {
      icon: '⏳',
      text: 'Saving...',
      color: 'text-blue-500',
    },
    saved: {
      icon: '✅',
      text: 'Saved',
      color: 'text-green-500',
    },
    error: {
      icon: '❌',
      text: 'Save failed',
      color: 'text-red-500',
    },
  };

  const config = statusConfig[status] || {};

  return (
    <div className={`flex items-center gap-2 text-xs font-semibold ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert dayjs objects and dates to ISO strings
 */
export const convertDatesToStringsDeep = (obj) => {
  if (!obj) return obj;

  if (Array.isArray(obj)) return obj.map(convertDatesToStringsDeep);

  if (typeof obj === 'object') {
    // Handle dayjs
    if (obj.isValid && typeof obj.isValid === 'function') {
      return obj.toISOString();
    }
    // Handle Date
    if (obj instanceof Date) {
      return obj.toISOString();
    }

    const out = {};
    for (const k in obj) {
      out[k] = convertDatesToStringsDeep(obj[k]);
    }
    return out;
  }

  return obj;
};

/**
 * Convert ISO strings back to dayjs objects
 */
export const convertAnyDateToDayjsDeep = (value) => {
  if (!value) return value;

  // Import dayjs inside function to avoid circular deps
  const dayjs = require('dayjs').default;

  if (dayjs.isDayjs(value)) return value;
  if (value instanceof Date) return dayjs(value);

  if (typeof value === 'string') {
    const isIsoDate = /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value);
    if (!isIsoDate) return value;

    const d = dayjs(value);
    return d.isValid() ? d : value;
  }

  if (Array.isArray(value)) {
    return value.map(convertAnyDateToDayjsDeep);
  }

  if (typeof value === 'object') {
    const out = {};
    for (const k in value) {
      out[k] = convertAnyDateToDayjsDeep(value[k]);
    }
    return out;
  }

  return value;
};

/**
 * Check if form has unsaved changes
 */
export const hasFormChanges = (form, initialValues) => {
  if (!form) return false;

  const currentValues = form.getFieldsValue();
  const current = JSON.stringify(convertDatesToStringsDeep(currentValues));
  const initial = JSON.stringify(convertDatesToStringsDeep(initialValues));

  return current !== initial;
};

const defaultExport = {
  useFormAutoSave,
  usePreventPageRefresh,
  AutoSaveIndicator,
  convertDatesToStringsDeep,
  convertAnyDateToDayjsDeep,
  hasFormChanges,
  STORAGE_KEYS,
};

export default defaultExport;
