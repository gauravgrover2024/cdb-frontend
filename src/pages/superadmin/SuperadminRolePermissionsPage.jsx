import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Checkbox, Popconfirm, Spin, Tag, message } from "antd";
import { Check, ShieldCheck } from "lucide-react";
import { fetchRolePermissions, updateRolePermissions } from "../../api/users";
import { ROLE_OPTIONS } from "../../components/ui/SuperadminUsersTable";

const ACTIONS = ["view", "add", "edit", "delete"];

const parseField = (fieldDefinition) => (Array.isArray(fieldDefinition)
  ? { key: fieldDefinition[0], label: fieldDefinition[1], calculated: fieldDefinition[2] }
  : fieldDefinition);

// Mirrors useRBAC().can for a field inside its own section.
// A module with no saved config is unrestricted (full access).
const effectiveValue = (modulePermissions, sectionKey, fieldKey, action) => {
  if (!modulePermissions) return true;
  const section = modulePermissions[sectionKey];
  if (!section) return false;
  const field = fieldKey ? section.fields?.[fieldKey] : null;
  if (field && typeof field[action] === "boolean") return field[action];
  return Boolean(section[action]);
};

const sectionFlags = (fields, fallback) => Object.fromEntries(ACTIONS.map((action) => [
  action,
  fields.length ? fields.some((field) => field[action]) : Boolean(fallback?.[action]),
]));

// Expands a module into explicit booleans for every section and field in the catalog,
// so what the screen shows is exactly what gets enforced.
const materializeModule = (moduleConfig, modulePermissions) => Object.fromEntries(
  moduleConfig.sections.map((section) => {
    const fields = Object.fromEntries(section.fields.map(parseField).map(({ key }) => [
      key,
      Object.fromEntries(ACTIONS.map((action) => [action, effectiveValue(modulePermissions, section.key, key, action)])),
    ]));
    const fallback = modulePermissions
      ? modulePermissions[section.key]
      : Object.fromEntries(ACTIONS.map((action) => [action, true]));
    return [section.key, { ...sectionFlags(Object.values(fields), fallback), fields }];
  }),
);

const setAllInModule = (moduleConfig, value) => Object.fromEntries(
  moduleConfig.sections.map((section) => [section.key, {
    ...Object.fromEntries(ACTIONS.map((action) => [action, value])),
    fields: Object.fromEntries(section.fields.map(parseField).map(({ key }) => [
      key,
      Object.fromEntries(ACTIONS.map((action) => [action, value])),
    ])),
  }]),
);

const SuperadminRolePermissionsPage = () => {
  const [savedByRole, setSavedByRole] = useState({});
  const [drafts, setDrafts] = useState({});
  const [catalog, setCatalog] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const roles = ROLE_OPTIONS.map(({ value }) => value);
  const isSuperadmin = selectedRole === "superadmin";
  const moduleConfig = catalog.find((item) => item.key === selectedModule);
  const permissions = drafts[selectedRole] || {};
  const modulePermissions = permissions[selectedModule];
  const isRestricted = Boolean(modulePermissions);

  const isDirty = (role) => JSON.stringify(drafts[role] || {}) !== JSON.stringify(savedByRole[role] || {});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetchRolePermissions(token);
        if (!mounted) return;
        const savedRoles = Array.isArray(response?.data) ? response.data : [];
        const saved = Object.fromEntries(ROLE_OPTIONS.map(({ value }) => [
          value,
          savedRoles.find((item) => item.role === value)?.permissions || {},
        ]));
        const nextCatalog = Array.isArray(response?.catalog) ? response.catalog : [];
        setSavedByRole(saved);
        setDrafts(saved);
        setCatalog(nextCatalog);
        setSelectedRole(ROLE_OPTIONS[0]?.value || "");
        setSelectedModule(nextCatalog[0]?.key || "");
      } catch (err) {
        if (mounted) setError(err?.message || "Failed to load permissions");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const updateModule = (updater) => {
    if (!moduleConfig || isSuperadmin) return;
    setDrafts((previous) => {
      const rolePermissions = previous[selectedRole] || {};
      const nextModule = updater(materializeModule(moduleConfig, rolePermissions[selectedModule]));
      return { ...previous, [selectedRole]: { ...rolePermissions, [selectedModule]: nextModule } };
    });
  };

  const setSectionPermission = (sectionKey, action, value) => updateModule((module) => {
    const section = module[sectionKey];
    const fields = Object.fromEntries(Object.entries(section.fields).map(([key, field]) => [key, { ...field, [action]: value }]));
    return { ...module, [sectionKey]: { ...section, [action]: value, fields } };
  });

  const setFieldPermission = (sectionKey, fieldKey, action, value) => updateModule((module) => {
    const section = module[sectionKey];
    const fields = { ...section.fields, [fieldKey]: { ...section.fields[fieldKey], [action]: value } };
    return { ...module, [sectionKey]: { ...section, ...sectionFlags(Object.values(fields), section), fields } };
  });

  const setWholeModule = (value) => updateModule(() => setAllInModule(moduleConfig, value));

  const removeRestrictions = () => {
    setDrafts((previous) => {
      const rest = { ...(previous[selectedRole] || {}) };
      delete rest[selectedModule];
      return { ...previous, [selectedRole]: rest };
    });
  };

  const discardChanges = () => {
    setDrafts((previous) => ({ ...previous, [selectedRole]: savedByRole[selectedRole] || {} }));
  };

  const moduleSummary = (moduleKey) => {
    const config = catalog.find((item) => item.key === moduleKey);
    const current = permissions[moduleKey];
    if (!config || !current) return "Full";
    let allowed = 0;
    let total = 0;
    config.sections.forEach((section) => section.fields.map(parseField).forEach(({ key }) => {
      total += 1;
      if (effectiveValue(current, section.key, key, "view")) allowed += 1;
    }));
    return `${allowed}/${total}`;
  };

  const sectionRows = useMemo(() => moduleConfig?.sections || [], [moduleConfig]);

  const save = async () => {
    if (!selectedRole || isSuperadmin) return;
    const role = selectedRole;
    const payload = drafts[role] || {};
    setSaving(true);
    try {
      await updateRolePermissions(role, payload, token);
      setSavedByRole((previous) => ({ ...previous, [role]: payload }));
      message.success(`Permissions saved for ${role.replaceAll("_", " ")}`);
    } catch (err) {
      message.error(err?.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Spin size="large" /></div>;
  if (error) return <Alert type="error" showIcon message={error} />;

  const selectedDirty = isDirty(selectedRole);

  return (
    <div className="mx-auto max-w-screen space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><ShieldCheck size={22} /></div>
          <div><h1 className="text-xl font-bold text-slate-900">Roles &amp; Permissions</h1><p className="text-sm text-slate-500">Manage module, section and field access for existing roles.</p></div>
        </div>
        <div className="flex items-center gap-2">
          {selectedDirty && <Tag color="orange">Unsaved changes</Tag>}
          <Button disabled={!selectedDirty || saving} onClick={discardChanges}>Discard</Button>
          <Button type="primary" loading={saving} disabled={!selectedRole || isSuperadmin || !selectedDirty} onClick={save}>Save Permissions</Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_220px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="px-3 pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Roles</div>
          <div className="space-y-1">
            {roles.map((role) => {
              const active = role === selectedRole;
              return <button key={role} type="button" onClick={() => setSelectedRole(role)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold capitalize transition ${active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
                <span>{role.replaceAll("_", " ")}</span>
                <span className="flex items-center gap-2">{isDirty(role) && <span className="h-2 w-2 rounded-full bg-orange-400" title="Unsaved changes" />}{active && <Check size={16} />}</span>
              </button>;
            })}
          </div>
        </aside>

        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="px-3 pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Modules</div>
          <div className="space-y-1">
            {catalog.map((item) => {
              const active = item.key === selectedModule;
              const summary = isSuperadmin ? "Full" : moduleSummary(item.key);
              return <button key={item.key} type="button" onClick={() => setSelectedModule(item.key)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
                <span>{item.label}</span><span className={`text-xs ${active ? "text-slate-300" : "text-slate-400"}`} title="Viewable fields">{summary}</span>
              </button>;
            })}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          {isSuperadmin && <Alert type="info" showIcon message="Superadmin always has full access and cannot be restricted." />}
          {!isSuperadmin && moduleConfig && (
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                {isRestricted
                  ? <><Tag color="blue">Restricted</Tag>Only the ticked permissions below are allowed for this role.</>
                  : <><Tag color="green">Full access</Tag>This module is not restricted. Change any checkbox to start restricting it.</>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="small" onClick={() => setWholeModule(true)}>Allow all</Button>
                <Button size="small" onClick={() => setWholeModule(false)}>Deny all</Button>
                {isRestricted && (
                  <Popconfirm title="Remove all restrictions for this module?" onConfirm={removeRestrictions}>
                    <Button size="small" danger>Reset to full access</Button>
                  </Popconfirm>
                )}
              </div>
            </div>
          )}
          {sectionRows.map((section) => {
            const fields = section.fields.map(parseField);
            return <div key={section.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-bold capitalize text-slate-900">{section.label}</h2>
                <div className="flex flex-wrap gap-3">{ACTIONS.map((action) => {
                  const values = fields.length
                    ? fields.map((field) => isSuperadmin || effectiveValue(modulePermissions, section.key, field.key, action))
                    : [isSuperadmin || effectiveValue(modulePermissions, section.key, null, action)];
                  const checkedCount = values.filter(Boolean).length;
                  return <Checkbox key={action} disabled={isSuperadmin} checked={checkedCount === values.length} indeterminate={checkedCount > 0 && checkedCount < values.length} onChange={(e) => setSectionPermission(section.key, action, e.target.checked)}>
                    <span className="text-xs font-semibold uppercase text-slate-600">{action}</span>
                  </Checkbox>;
                })}</div>
              </div>
              <div className="divide-y divide-slate-100">{fields.map(({ key: fieldKey, label: fieldLabel, calculated }) => (
                <div key={fieldKey} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-2 text-sm text-slate-700"><span>{fieldLabel}</span>{calculated && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Auto-calculated</span>}</span>
                  <div className="grid grid-cols-4 gap-3">{ACTIONS.map((action) => (
                    <Checkbox key={action} disabled={isSuperadmin} checked={isSuperadmin || effectiveValue(modulePermissions, section.key, fieldKey, action)} onChange={(e) => setFieldPermission(section.key, fieldKey, action, e.target.checked)}>
                      <span className="text-[11px] font-semibold uppercase text-slate-500">{action}</span>
                    </Checkbox>
                  ))}</div>
                </div>
              ))}</div>
            </div>;
          })}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500"><span className="flex items-center gap-2"><Check size={14} />Field-level permissions control every input, document and calculation.</span><span>Section checkboxes toggle every field in that section.</span><span>Users pick up saved changes when they return to their tab or reload.</span></div>
        </main>
      </div>
    </div>
  );
};

export default SuperadminRolePermissionsPage;
