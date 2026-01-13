"use client";

import { memo, useMemo, useState, useEffect, useCallback } from "react";
import type { ProxyData } from "../../types/proxy";
import ProxyExportActions from "./ProxyExportActions";
import { ProxyTable } from "./ProxyTable";

interface ProxyListInteractiveProps {
  data: ProxyData[];
  basePath: string;
  query?: Record<string, string | number | undefined>;
}

function ProxyListInteractive({
  data,
  basePath,
  query,
}: ProxyListInteractiveProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [data]);

  const selected = useMemo(
    () => data.filter((proxy) => selectedKeys.has(`${proxy.ip}:${proxy.port}`)),
    [data, selectedKeys],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  return (
    <div className="space-y-4">
      <ProxyExportActions
        data={data}
        selected={selected}
        basePath={basePath}
        query={query}
        onClearSelection={handleClearSelection}
      />
      <ProxyTable
        data={data}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
      />
    </div>
  );
}

export default memo(ProxyListInteractive);
