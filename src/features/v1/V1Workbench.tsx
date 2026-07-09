import { useMemo, useState } from "react";
import { SourceLabel } from "../../components/SourceLabel";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDateTime } from "../../lib/date";
import type { Phase0MessyRecord } from "../phase-0/phase0-types";

type SafetyLevel = "blocked" | "review_first" | "draftable";
type ReviewDecision =
  "pending" | "not_adopted" | "adopt_as_unconfirmed" | "ready_for_decision";
type AutoCredibilityLevel = "high" | "medium" | "low";
type DraftCredibilityLevel = AutoCredibilityLevel | "confirmed_true";
type NextActionDecision =
  | "not_selected"
  | "ask_for_key_info"
  | "keep_tracking"
  | "handoff_for_decision"
  | "do_not_dispatch";
type DecisionChecklistItem =
  "source_checked" | "time_checked" | "location_checked" | "not_auto_dispatch";

type V1Draft = {
  recordId: string;
  candidateSummary: string;
  actionSafetyLevel: SafetyLevel;
  credibilityLevel: DraftCredibilityLevel;
  credibilityReason: string;
  reviewDecision: ReviewDecision;
  decisionChecklist: DecisionChecklistItem[];
  reviewer: string;
  judgementBasis: string;
  humanCorrections: string;
};

type V1AutoCheck = {
  missingOrUnclear: string[];
  actionSafetyLevel: SafetyLevel;
  credibilityLevel: AutoCredibilityLevel;
  candidateSummary: string;
  canFormCandidate: boolean;
};

const safetyLabels: Record<SafetyLevel, string> = {
  blocked: "行動安全程度不足",
  review_first: "缺少關鍵資訊",
  draftable: "可初步整理成候選草稿",
};

const credibilityLabels: Record<DraftCredibilityLevel, string> = {
  high: "可信度高",
  medium: "可信度中",
  low: "可信度低",
  confirmed_true: "人工確認為真實",
};

const decisionLabels: Record<ReviewDecision, string> = {
  pending: "未審查",
  not_adopted: "暫時不採用",
  adopt_as_unconfirmed: "採用為未確認整理草稿",
  ready_for_decision: "準備下決策",
};

const nextActionLabels: Record<NextActionDecision, string> = {
  not_selected: "尚未選擇",
  ask_for_key_info: "補問關鍵資訊",
  keep_tracking: "保留追蹤",
  handoff_for_decision: "交給人工決策",
  do_not_dispatch: "暫不派工",
};
const baseUrl = import.meta.env.BASE_URL;

const decisionChecklistItems: Array<{
  id: DecisionChecklistItem;
  label: string;
}> = [
  { id: "source_checked", label: "已檢查來源與轉述關係" },
  { id: "time_checked", label: "已檢查時間仍可能有效" },
  { id: "location_checked", label: "已檢查地點或範圍足夠清楚" },
  { id: "not_auto_dispatch", label: "已確認這不是自動派工決策" },
];

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function buildAutoCheck(record: Phase0MessyRecord): V1AutoCheck {
  const rawText = record.rawText;
  const missingOrUnclear: string[] = [];

  if (record.verificationStatus !== "verified") {
    missingOrUnclear.push("查核狀態仍不是已確認。");
  }

  if (["social_post", "phone_call"].includes(record.sourceType)) {
    missingOrUnclear.push("來源可能不是現場第一手資訊。");
  }

  if (includesAny(rawText, ["有人說", "群組說", "留言有人說", "來電表示"])) {
    missingOrUnclear.push("內容包含轉述，需要確認原始說法來源。");
  }

  if (includesAny(rawText, ["不知道", "疑似", "不確定", "尚未確認", "可能"])) {
    missingOrUnclear.push("原文有不確定語氣，不能改寫成事實。");
  }

  if (
    includesAny(rawText, ["昨天", "早上", "中午前", "下午", "剛剛", "14:20"])
  ) {
    missingOrUnclear.push("時間線需要確認是否仍有效。");
  }

  if (
    includesAny(rawText, [
      "附近",
      "後面",
      "那邊",
      "A 區",
      "第二排住家",
      "老街附近",
    ])
  ) {
    missingOrUnclear.push("地點描述不足以直接支持行動。");
  }

  if (
    includesAny(rawText, [
      "不適合停留",
      "道路封閉",
      "不要再派人",
      "藥品",
      "長者",
      "完整地址",
      "家屬不在現場",
    ])
  ) {
    missingOrUnclear.push("內容涉及行動安全或當事人確認風險。");
  }

  const actionSafetyLevel = missingOrUnclear.some((item) =>
    item.includes("行動安全"),
  )
    ? "blocked"
    : missingOrUnclear.length >= 3
      ? "review_first"
      : "draftable";
  const credibilityLevel: AutoCredibilityLevel =
    record.verificationStatus === "unverified" ||
    ["social_post", "phone_call"].includes(record.sourceType) ||
    includesAny(rawText, ["有人說", "群組說", "疑似", "不確定"])
      ? "low"
      : missingOrUnclear.length >= 3
        ? "medium"
        : "high";

  const canFormCandidate = actionSafetyLevel !== "blocked";
  const candidateSummary = canFormCandidate
    ? "可建立候選整理草稿，但仍須標示未確認並等待人工最後確認。"
    : "暫時不形成可行動任務，先保留原文、卡住原因與待確認問題。";

  return {
    missingOrUnclear:
      missingOrUnclear.length > 0
        ? missingOrUnclear
        : ["目前沒有被規則抓到的缺漏，但仍需要人工檢查原文脈絡。"],
    actionSafetyLevel,
    credibilityLevel,
    candidateSummary,
    canFormCandidate,
  };
}

function createDraft(
  record: Phase0MessyRecord,
  autoCheck: V1AutoCheck,
): V1Draft {
  return {
    recordId: record.id,
    candidateSummary: autoCheck.candidateSummary,
    actionSafetyLevel: autoCheck.actionSafetyLevel,
    credibilityLevel: autoCheck.credibilityLevel,
    credibilityReason: "",
    reviewDecision: "not_adopted",
    decisionChecklist: [],
    reviewer: "",
    judgementBasis: record.rawText,
    humanCorrections: "",
  };
}

function isDecisionChecklistComplete(draft: V1Draft) {
  return decisionChecklistItems.every((item) =>
    draft.decisionChecklist.includes(item.id),
  );
}

function canPrepareForDecision(draft: V1Draft) {
  const hasCredibilityReason =
    draft.credibilityLevel !== "confirmed_true" ||
    draft.credibilityReason.trim().length > 0;

  return hasCredibilityReason && isDecisionChecklistComplete(draft);
}

export function V1Workbench({ records }: { records: Phase0MessyRecord[] }) {
  const [selectedRecordId, setSelectedRecordId] = useState(
    records[0]?.id ?? "",
  );
  const [draftsByRecordId, setDraftsByRecordId] = useState<
    Record<string, V1Draft>
  >({});
  const [nextActionsByRecordId, setNextActionsByRecordId] = useState<
    Record<string, NextActionDecision>
  >({});
  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ?? records[0];
  const autoChecksByRecordId = useMemo(
    () =>
      Object.fromEntries(
        records.map((record) => [record.id, buildAutoCheck(record)]),
      ),
    [records],
  );
  const selectedAutoCheck = autoChecksByRecordId[selectedRecord.id];
  const selectedDraft = draftsByRecordId[selectedRecord.id];
  const readyForDecisionDrafts = Object.values(draftsByRecordId).filter(
    (draft) => draft.reviewDecision === "ready_for_decision",
  );

  function upsertDraft(nextDraft: V1Draft) {
    setDraftsByRecordId((current) => ({
      ...current,
      [nextDraft.recordId]: nextDraft,
    }));
  }

  function startDraft() {
    upsertDraft(
      selectedDraft ?? createDraft(selectedRecord, selectedAutoCheck),
    );
  }

  function updateDraft(patch: Partial<V1Draft>) {
    const baseDraft =
      selectedDraft ?? createDraft(selectedRecord, selectedAutoCheck);
    upsertDraft({ ...baseDraft, ...patch });
  }

  function updateReviewDecision(reviewDecision: ReviewDecision) {
    const baseDraft =
      selectedDraft ?? createDraft(selectedRecord, selectedAutoCheck);

    if (
      reviewDecision === "ready_for_decision" &&
      !canPrepareForDecision(baseDraft)
    ) {
      return;
    }

    upsertDraft({ ...baseDraft, reviewDecision });
  }

  function updateDecisionChecklist(
    itemId: DecisionChecklistItem,
    isChecked: boolean,
  ) {
    const baseDraft =
      selectedDraft ?? createDraft(selectedRecord, selectedAutoCheck);
    const nextChecklist = isChecked
      ? Array.from(new Set([...baseDraft.decisionChecklist, itemId]))
      : baseDraft.decisionChecklist.filter((item) => item !== itemId);

    const nextDraft = {
      ...baseDraft,
      decisionChecklist: nextChecklist,
    };

    upsertDraft({
      ...nextDraft,
      reviewDecision:
        nextDraft.reviewDecision === "ready_for_decision" &&
        !canPrepareForDecision(nextDraft)
          ? "not_adopted"
          : nextDraft.reviewDecision,
    });
  }

  function resetDraft() {
    upsertDraft(createDraft(selectedRecord, selectedAutoCheck));
  }

  function deleteDraft() {
    setDraftsByRecordId((current) => {
      const next = { ...current };
      delete next[selectedRecord.id];
      return next;
    });
    setNextActionsByRecordId((current) => {
      const next = { ...current };
      delete next[selectedRecord.id];
      return next;
    });
  }

  function updateNextAction(
    recordId: string,
    nextActionDecision: NextActionDecision,
  ) {
    setNextActionsByRecordId((current) => ({
      ...current,
      [recordId]: nextActionDecision,
    }));
  }

  return (
    <div className="v1-page">
      <header className="v1-header">
        <div>
          <p className="eyebrow">v1 / 來源仍是 Phase 0 原始資訊</p>
          <h1>人工確認優先的整理草稿工作台</h1>
          <p>
            依照
            flow.md：系統先提示缺漏與行動安全程度，資訊整理者最後決定採用或不採用。
            這裡輸出的不是已確認任務，也不是救災行動決策。
          </p>
        </div>
        <a href={baseUrl}>回到 Phase 0 首頁</a>
      </header>

      <section className="v1-summary" aria-label="v1 狀態摘要">
        <div>
          <strong>{records.length}</strong>
          <span>筆 Phase 0 原始資訊</span>
        </div>
        <div>
          <strong>{Object.keys(draftsByRecordId).length}</strong>
          <span>筆整理草稿</span>
        </div>
      </section>

      <div className="v1-layout">
        <aside className="v1-queue" aria-label="選擇要整理的原始資訊">
          {records.map((record) => {
            const autoCheck = autoChecksByRecordId[record.id];
            const draft = draftsByRecordId[record.id];

            return (
              <button
                className={record.id === selectedRecord.id ? "active" : ""}
                key={record.id}
                type="button"
                onClick={() => setSelectedRecordId(record.id)}
              >
                <span className="v1-queue__id">{record.id}</span>
                <span
                  className={`safety-pill safety-pill--${autoCheck.actionSafetyLevel}`}
                >
                  {safetyLabels[autoCheck.actionSafetyLevel]}
                </span>
                <span
                  className={`credibility-pill credibility-pill--${autoCheck.credibilityLevel}`}
                >
                  {credibilityLabels[autoCheck.credibilityLevel]}
                </span>
                <span className="draft-state">
                  {draft ? decisionLabels[draft.reviewDecision] : "未審查"}
                </span>
              </button>
            );
          })}
        </aside>

        <main className="v1-main">
          <section className="v1-card v1-source-card">
            <div className="v1-card__header">
              <div>
                <p className="eyebrow">自動讀取</p>
                <h2>{selectedRecord.id}</h2>
              </div>
              <StatusBadge status={selectedRecord.verificationStatus} />
            </div>
            <p>{selectedRecord.rawText}</p>
            <div className="record-card__meta">
              <SourceLabel sourceType={selectedRecord.sourceType} />
              <span>更新：{formatDateTime(selectedRecord.updatedAt)}</span>
            </div>
          </section>

          <section className="v1-card v1-system-card">
            <div className="v1-card__header">
              <div>
                <p className="eyebrow">系統提示</p>
                <h2>缺少或模糊的欄位</h2>
              </div>
              <span
                className={`safety-pill safety-pill--${selectedAutoCheck.actionSafetyLevel}`}
              >
                {safetyLabels[selectedAutoCheck.actionSafetyLevel]}
              </span>
              <span
                className={`credibility-pill credibility-pill--${selectedAutoCheck.credibilityLevel}`}
              >
                {credibilityLabels[selectedAutoCheck.credibilityLevel]}
              </span>
            </div>
            <ul className="v1-list">
              {selectedAutoCheck.missingOrUnclear.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="v1-note">
              這些提示只協助資訊整理者檢查，不代表系統已判定資訊為真。
            </p>
          </section>

          <section className="v1-card">
            <div className="v1-card__header">
              <div>
                <p className="eyebrow">候選整理</p>
                <h2>整理草稿與最後確認</h2>
              </div>
              <span className="draft-state draft-state--ready">
                {selectedDraft
                  ? decisionLabels[selectedDraft.reviewDecision]
                  : "未審查"}
              </span>
              {selectedDraft?.credibilityLevel === "confirmed_true" ? (
                <span className="credibility-pill credibility-pill--confirmed_true">
                  {credibilityLabels.confirmed_true}
                </span>
              ) : null}
            </div>

            {selectedDraft ? (
              <form
                className="v1-draft-form"
                onSubmit={(event) => event.preventDefault()}
              >
                <label>
                  候選整理摘要
                  <textarea
                    rows={3}
                    value={selectedDraft.candidateSummary}
                    onChange={(event) =>
                      updateDraft({ candidateSummary: event.target.value })
                    }
                  />
                </label>

                <label>
                  行動安全程度提示
                  <select
                    value={selectedDraft.actionSafetyLevel}
                    onChange={(event) =>
                      updateDraft({
                        actionSafetyLevel: event.target.value as SafetyLevel,
                      })
                    }
                  >
                    <option value="blocked">行動安全程度不足</option>
                    <option value="review_first">缺少關鍵資訊</option>
                    <option value="draftable">可初步整理成候選草稿</option>
                  </select>
                </label>

                <label>
                  資料可信度
                  <select
                    value={selectedDraft.credibilityLevel}
                    onChange={(event) =>
                      updateDraft({
                        credibilityLevel: event.target
                          .value as DraftCredibilityLevel,
                      })
                    }
                  >
                    <option value="high">高：來源與內容相對清楚</option>
                    <option value="medium">中：有部分資訊仍需補確認</option>
                    <option value="low">低：轉述、不確定或來源不足</option>
                    <option value="confirmed_true">
                      人工確認為真實：只能由整理者選擇
                    </option>
                  </select>
                </label>

                {selectedDraft.credibilityLevel === "confirmed_true" ? (
                  <label>
                    人工確認依據
                    <textarea
                      rows={3}
                      value={selectedDraft.credibilityReason}
                      onChange={(event) =>
                        updateDraft({ credibilityReason: event.target.value })
                      }
                      placeholder="寫下你如何確認這筆資料為真實，例如確認來源、時間與原文依據。"
                    />
                  </label>
                ) : null}

                <label>
                  最後人工確認結果
                  <select
                    value={selectedDraft.reviewDecision}
                    onChange={(event) =>
                      updateReviewDecision(event.target.value as ReviewDecision)
                    }
                  >
                    <option value="pending">未審查</option>
                    <option value="not_adopted">暫時不採用</option>
                    <option value="adopt_as_unconfirmed">
                      採用為未確認整理草稿
                    </option>
                    <option
                      disabled={!canPrepareForDecision(selectedDraft)}
                      value="ready_for_decision"
                    >
                      準備下決策
                    </option>
                  </select>
                </label>

                <fieldset className="v1-draft-form__wide v1-checklist">
                  <legend>決策前檢查清單</legend>
                  {decisionChecklistItems.map((item) => (
                    <label key={item.id}>
                      <input
                        checked={selectedDraft.decisionChecklist.includes(
                          item.id,
                        )}
                        type="checkbox"
                        onChange={(event) =>
                          updateDecisionChecklist(item.id, event.target.checked)
                        }
                      />
                      {item.label}
                    </label>
                  ))}
                  <p>全部完成後，最後人工確認結果才可以選「準備下決策」。</p>
                </fieldset>

                <label>
                  判斷者
                  <input
                    type="text"
                    value={selectedDraft.reviewer}
                    onChange={(event) =>
                      updateDraft({ reviewer: event.target.value })
                    }
                    placeholder="填小組成員或角色，不填真實個資"
                  />
                </label>

                <label className="v1-draft-form__wide">
                  依據原文
                  <textarea
                    rows={4}
                    value={selectedDraft.judgementBasis}
                    onChange={(event) =>
                      updateDraft({ judgementBasis: event.target.value })
                    }
                  />
                </label>

                <label className="v1-draft-form__wide">
                  人工修正或質疑 AI 預填
                  <textarea
                    rows={4}
                    value={selectedDraft.humanCorrections}
                    onChange={(event) =>
                      updateDraft({ humanCorrections: event.target.value })
                    }
                    placeholder="例：AI 把這筆看成可派工，但原文沒有清楚地點與現場安全資訊。"
                  />
                </label>

                <p className="v1-form-note">
                  「人工確認為真實」只能由整理者在資料可信度欄位手動選擇；
                  系統自動提示只會產生高中低，不會改寫原始資訊的查核狀態，也不會自動變成已確認任務。
                </p>

                <div className="v1-actions">
                  <button type="button" onClick={resetDraft}>
                    重設為流程預設
                  </button>
                  <button type="button" onClick={deleteDraft}>
                    刪除草稿
                  </button>
                </div>
              </form>
            ) : (
              <div className="v1-empty-draft">
                <p>
                  先建立一份整理草稿，再由資訊整理者修正。候選結果仍只能是未確認，
                  不能變成已確認任務。
                </p>
                <button type="button" onClick={startDraft}>
                  建立 v1 整理草稿
                </button>
              </div>
            )}
          </section>

          <section className="v1-card v1-decision-workspace">
            <div className="v1-card__header">
              <div>
                <p className="eyebrow">下一步行動工作區</p>
                <h2>只接收準備下決策的資料</h2>
              </div>
              <span className="draft-state">
                {readyForDecisionDrafts.length} 筆待決策
              </span>
            </div>

            {readyForDecisionDrafts.length > 0 ? (
              <div className="v1-decision-list">
                {readyForDecisionDrafts.map((draft) => {
                  const record =
                    records.find((item) => item.id === draft.recordId) ??
                    selectedRecord;
                  const nextActionDecision =
                    nextActionsByRecordId[draft.recordId] ?? "not_selected";

                  return (
                    <article className="v1-decision-item" key={draft.recordId}>
                      <div>
                        <strong>{draft.recordId}</strong>
                        <p>{draft.candidateSummary}</p>
                      </div>
                      <label>
                        下一步處理方向
                        <select
                          value={nextActionDecision}
                          onChange={(event) =>
                            updateNextAction(
                              draft.recordId,
                              event.target.value as NextActionDecision,
                            )
                          }
                        >
                          <option value="not_selected">尚未選擇</option>
                          <option value="ask_for_key_info">補問關鍵資訊</option>
                          <option value="keep_tracking">保留追蹤</option>
                          <option value="handoff_for_decision">
                            交給人工決策
                          </option>
                          <option value="do_not_dispatch">暫不派工</option>
                        </select>
                      </label>
                      <p className="v1-decision-item__note">
                        來源：{record.id}，目前選擇：
                        {nextActionLabels[nextActionDecision]}
                        。這裡只整理下一步處理方向，
                        不自動派工或做真實救災決策。
                      </p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="v1-empty-message">
                最後人工確認結果選「準備下決策」後，資料才會進入這個工作區。
              </p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
