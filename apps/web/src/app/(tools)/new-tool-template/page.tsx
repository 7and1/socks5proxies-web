export default function NewToolTemplatePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">New Tool Template</h1>
      <p className="text-ink-muted">
        Duplicate this folder and register your tool in{" "}
        <code className="font-mono">src/config/tools.ts</code>.
      </p>
      <div className="rounded-2xl border border-dashed border-sand-300 bg-white/70 p-6">
        <p className="text-sm text-ink-muted">Drop your tool UI here.</p>
      </div>
    </div>
  );
}
