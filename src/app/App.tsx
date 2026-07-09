import { type ReactNode, useState } from "react";
import messyReports from "../fixtures/phase-0/messy-reports.json";
import { EmptyState } from "../components/EmptyState";
import { Phase0RawInfoPanel } from "../features/phase-0/Phase0RawInfoPanel";
import { Phase0Workbench } from "../features/phase-0/Phase0Workbench";
import type { Phase0MessyRecord } from "../features/phase-0/phase0-types";
import { V1Workbench } from "../features/v1/V1Workbench";

type TabKey = "raw" | "workbench";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "raw", label: "原始資訊" },
  { key: "workbench", label: "整理工作台" },
];

const phase0Records = messyReports satisfies Phase0MessyRecord[];
const baseUrl = import.meta.env.BASE_URL;
const v1DemoPassword = "123456";
const v1AccessSessionKey = "v1-workbench-unlocked";

function joinBaseUrl(path: string) {
  return `${baseUrl}${path}`.replace(/\/{2,}/g, "/");
}

function V1AccessGate({ children }: { children: ReactNode }) {
  const [v1Password, setV1Password] = useState("");
  const [isV1Unlocked, setIsV1Unlocked] = useState(
    () => sessionStorage.getItem(v1AccessSessionKey) === "true",
  );
  const [v1PasswordError, setV1PasswordError] = useState("");

  if (isV1Unlocked) {
    return <>{children}</>;
  }

  return (
    <main className="v1-auth-page">
      <form
        className="v1-auth-card"
        onSubmit={(event) => {
          event.preventDefault();

          if (v1Password === v1DemoPassword) {
            sessionStorage.setItem(v1AccessSessionKey, "true");
            setIsV1Unlocked(true);
            setV1PasswordError("");
            return;
          }

          setV1PasswordError("密碼不正確，請重新輸入。");
        }}
      >
        <p className="eyebrow">v1 人工確認工作台</p>
        <h1>請先輸入存取密碼</h1>
        <p>這是課堂 demo 的前端密碼門檻，不代表真實安全驗證。</p>
        <label>
          密碼
          <input
            autoComplete="current-password"
            type="password"
            value={v1Password}
            onChange={(event) => setV1Password(event.target.value)}
          />
        </label>
        {v1PasswordError ? (
          <p className="v1-auth-card__error">{v1PasswordError}</p>
        ) : null}
        <div className="v1-auth-card__actions">
          <button type="submit">進入工作台</button>
          <a href={baseUrl}>回到 Phase 0 首頁</a>
        </div>
      </form>
    </main>
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("raw");
  const [selectedRecordId, setSelectedRecordId] = useState(
    phase0Records[0]?.id ?? "",
  );
  const normalizedPath = window.location.pathname.replace(/\/$/, "");
  const isV1Route = normalizedPath.endsWith("/v1");

  function selectForWorkbench(recordId: string) {
    setSelectedRecordId(recordId);
    setActiveTab("workbench");
  }

  if (isV1Route) {
    return (
      <V1AccessGate>
        <V1Workbench records={phase0Records} />
      </V1AccessGate>
    );
  }

  return (
    <main className="layout">
      <header className="hero">
        <p className="eyebrow">SITCON Camp 2026</p>
        <h1>災害資訊整理工作台</h1>
        <p>
          第一階段先用 coding agent
          做出可展示的前端原型，再從成果中看見資料品質、角色、狀態與來源的限制。
        </p>
        <a className="hero__link" href={joinBaseUrl("v1/")}>
          進入 v1 人工確認工作台
        </a>
      </header>

      <nav className="tabs" aria-label="第一階段工作區">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "active" : ""}
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="panel">
        {phase0Records.length === 0 ? (
          <EmptyState message="目前沒有資料" />
        ) : activeTab === "raw" ? (
          <Phase0RawInfoPanel
            records={phase0Records}
            selectedRecordId={selectedRecordId}
            onSelect={selectForWorkbench}
          />
        ) : (
          <Phase0Workbench
            records={phase0Records}
            selectedRecordId={selectedRecordId}
            onSelect={setSelectedRecordId}
          />
        )}
      </section>
    </main>
  );
}
