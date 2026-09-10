import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Spin, message } from "antd";
import { Check, ShieldCheck } from "lucide-react";
import { fetchRolePermissions, updateRolePermissions } from "../../api/users";
import { ROLE_OPTIONS } from "../../components/ui/SuperadminUsersTable";

const ACTIONS = ["view", "add", "edit", "delete"];

const SuperadminRolePermissionsPage = () => {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const currentRole = roles.find((item) => item.role === selectedRole);
  const moduleConfig = catalog.find((item) => item.key === selectedModule);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetchRolePermissions(token);
        if (!mounted) return;
        const savedRoles = Array.isArray(response?.data) ? response.data : [];
        const savedByRole = new Map(savedRoles.map((item) => [item.role, item]));
        const nextRoles = ROLE_OPTIONS.map(({ value }) => ({
          role: value,
          permissions: savedByRole.get(value)?.permissions || {},
        }));
        const nextCatalog = Array.isArray(response?.catalog) ? response.catalog : [];
        setRoles(nextRoles);
        setCatalog(nextCatalog);
        setSelectedRole(nextRoles[0]?.role || "");
        setSelectedModule(nextCatalog[0]?.key || "");
      } catch (err) {
        if (mounted) setError(err?.message || "Failed to load permissions");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    setPermissions(currentRole?.permissions || {});
  }, [selectedRole, currentRole]);

  const modulePermissions = permissions?.[selectedModule] || {};
  const setModulePermissions = (next) => {
    setPermissions((previous) => ({
      ...previous,
      [selectedModule]: { ...modulePermissions, ...next },
    }));
  };

  const setSectionPermission = (sectionKey, action, value) => {
    const section = modulePermissions[sectionKey] || {};
    setModulePermissions({ [sectionKey]: { ...section, [action]: value } });
  };

  const setFieldPermission = (sectionKey, fieldKey, action, value) => {
    const section = modulePermissions[sectionKey] || {};
    const fields = section.fields || {};
    setModulePermissions({
      [sectionKey]: {
        ...section,
        fields: { ...fields, [fieldKey]: { ...(fields[fieldKey] || {}), [action]: value } },
      },
    });
  };

  const sectionRows = useMemo(() => moduleConfig?.sections || [], [moduleConfig]);

  const save = async () => {
    if (!selectedRole || selectedRole === "superadmin") return;
    setSaving(true);
    try {
      await updateRolePermissions(selectedRole, permissions, token);
      setRoles((previous) => previous.map((item) => (
        item.role === selectedRole ? { ...item, permissions } : item
      )));
      message.success("Permissions saved successfully");
    } catch (err) {
      message.error(err?.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Spin size="large" /></div>;
  if (error) return <Alert type="error" showIcon message={error} />;

  return (
    <div className="mx-auto max-w-screen space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><ShieldCheck size={22} /></div>
          <div><h1 className="text-xl font-bold text-slate-900">Roles &amp; Permissions</h1><p className="text-sm text-slate-500">Manage module, section and field access for existing roles.</p></div>
        </div>
        <Button type="primary" loading={saving} disabled={!selectedRole || selectedRole === "superadmin"} onClick={save}>Save Permissions</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_220px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="px-3 pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Roles</div>
          <div className="space-y-1">
            {roles.map((item) => {
              const active = item.role === selectedRole;
              return <button key={item.role} type="button" onClick={() => setSelectedRole(item.role)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold capitalize transition ${active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
                <span>{item.role.replaceAll("_", " ")}</span>{active && <Check size={16} />}
              </button>;
            })}
          </div>
        </aside>

        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="px-3 pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Modules</div>
          <div className="space-y-1">
            {catalog.map((item) => {
              const active = item.key === selectedModule;
              return <button key={item.key} type="button" onClick={() => setSelectedModule(item.key)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
                <span>{item.label}</span><span className={`text-xs ${active ? "text-slate-300" : "text-slate-400"}`}>{item.sections.length}</span>
              </button>;
            })}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          {selectedRole === "superadmin" && <Alert type="info" showIcon message="Superadmin always has full access and cannot be restricted." />}
          {sectionRows.map((section) => {
          const sectionPermission = modulePermissions[section.key] || {};
          return <div key={section.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="font-bold capitalize text-slate-900">{section.label}</h2><div className="flex flex-wrap gap-3">{ACTIONS.map((action) => <label key={action} className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-600"><input type="checkbox" disabled={selectedRole === "superadmin"} checked={Boolean(sectionPermission[action])} onChange={(e) => setSectionPermission(section.key, action, e.target.checked)} />{action}</label>)}</div></div>
            <div className="divide-y divide-slate-100">{section.fields.map((fieldDefinition) => {
              const [fieldKey, fieldLabel, calculated] = Array.isArray(fieldDefinition)
                ? fieldDefinition
                : [fieldDefinition.key, fieldDefinition.label, fieldDefinition.calculated];
              const field = sectionPermission.fields?.[fieldKey] || {};
              return <div key={fieldKey} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-700"><span>{fieldLabel}</span>{calculated && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Auto-calculated</span>}</span>
                <div className="grid grid-cols-4 gap-3">{ACTIONS.map((action) => <label key={action} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-500"><input type="checkbox" disabled={selectedRole === "superadmin"} checked={Boolean(field[action])} onChange={(e) => setFieldPermission(section.key, fieldKey, action, e.target.checked)} />{action}</label>)}</div>
              </div>;
            })}</div>
          </div>;
          })}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500"><span className="flex items-center gap-2"><Check size={14} />Field-level permissions control every input, document and calculation.</span><span>Section actions act as bulk defaults; field settings take precedence.</span></div>
        </main>
      </div>
    </div>
  );
};

export default SuperadminRolePermissionsPage;
